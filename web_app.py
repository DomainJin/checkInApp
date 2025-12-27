from flask import Flask, render_template, request, jsonify, send_file, Response
import pandas as pd
import msoffcrypto
import io
from datetime import datetime
import os
import json
import time
from queue import Queue
import cv2
from pyzbar import pyzbar
import numpy as np
import threading

app = Flask(__name__)

# Queues for broadcasting check-in events to display clients
checkin_queue_0 = Queue()  # For camera 0 / display 0
checkin_queue_1 = Queue()  # For camera 1 / display 1

# OpenCV camera instances
opencv_cameras = {}
opencv_last_qr = {}  # Store last detected QR for each camera
opencv_camera_locks = {}

def init_opencv_camera(camera_index):
    """Initialize OpenCV camera"""
    if camera_index not in opencv_cameras:
        opencv_cameras[camera_index] = cv2.VideoCapture(camera_index)
        opencv_cameras[camera_index].set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        opencv_cameras[camera_index].set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        opencv_last_qr[camera_index] = {'qr_code': None, 'time': 0}
        opencv_camera_locks[camera_index] = threading.Lock()
    return opencv_cameras[camera_index]

def release_opencv_camera(camera_index):
    """Release OpenCV camera"""
    if camera_index in opencv_cameras:
        opencv_cameras[camera_index].release()
        del opencv_cameras[camera_index]
        if camera_index in opencv_camera_locks:
            del opencv_camera_locks[camera_index]

def generate_opencv_frames(camera_index):
    """Generate video frames from OpenCV camera"""
    camera = init_opencv_camera(camera_index)
    
    while True:
        with opencv_camera_locks[camera_index]:
            success, frame = camera.read()
            
            if not success:
                break
            
            # Decode QR codes in frame
            qr_codes = pyzbar.decode(frame)
            
            for qr in qr_codes:
                qr_data = qr.data.decode('utf-8')
                current_time = time.time()
                
                # Update last detected QR if different or after cooldown
                if (opencv_last_qr[camera_index]['qr_code'] != qr_data or 
                    current_time - opencv_last_qr[camera_index]['time'] > 3):
                    opencv_last_qr[camera_index] = {
                        'qr_code': qr_data,
                        'time': current_time
                    }
                
                # Draw rectangle around QR code
                points = qr.polygon
                if len(points) == 4:
                    pts = [(point.x, point.y) for point in points]
                    cv2.polylines(frame, [np.array(pts, dtype=np.int32)], True, (0, 255, 0), 3)
                
                # Draw QR data text
                cv2.putText(frame, qr_data, (qr.rect.left, qr.rect.top - 10),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
            
            # Encode frame to JPEG
            ret, buffer = cv2.imencode('.jpg', frame)
            frame_bytes = buffer.tobytes()
            
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

class WebCheckInApp:
    def __init__(self):
        self.source_file = 'source.xlsx'
        self.password = 'SCV2025'
        self.df = None
        self.sheet_name = None
        self.working_file = None
        
    def decrypt_excel(self, encrypted_file):
        """Decrypt password-protected Excel file"""
        decrypted = io.BytesIO()
        
        with open(encrypted_file, 'rb') as f:
            office_file = msoffcrypto.OfficeFile(f)
            office_file.load_key(password=self.password)
            office_file.decrypt(decrypted)
        
        decrypted.seek(0)
        return decrypted
    
    def find_existing_file(self, sheet_name):
        """Find existing Excel file for the sheet"""
        pattern = f'checkin_{sheet_name}_'
        for file in os.listdir('.'):
            if file.startswith(pattern) and file.endswith('.xlsx'):
                return file
        return None
    
    def load_sheet(self, sheet_name):
        """Load data from Excel sheet"""
        self.sheet_name = sheet_name
        
        # Kiểm tra xem đã có file Excel cho sheet này chưa
        existing_file = self.find_existing_file(sheet_name)
        
        if existing_file:
            # Sử dụng file đã có
            self.working_file = existing_file
            try:
                self.df = pd.read_excel(self.working_file, engine='openpyxl', header=0)
                self.df = self.df.dropna(how='all')
                self.df.columns = [col.strip() if isinstance(col, str) else col for col in self.df.columns]
                print(f"Đang sử dụng file: {self.working_file}")
                return True
            except Exception as e:
                print(f"Lỗi khi đọc file có sẵn: {e}")
                # Nếu lỗi, tạo file mới
                pass
        
        # Tạo file mới nếu chưa có hoặc file cũ bị lỗi
        self.working_file = f'checkin_{sheet_name}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
        
        try:
            decrypted_data = self.decrypt_excel(self.source_file)
            
            if sheet_name == 'ALL':
                decrypted_data.seek(0)
                df_hcm = pd.read_excel(decrypted_data, sheet_name='HCM', engine='openpyxl', header=0)
                decrypted_data.seek(0)
                df_hanoi = pd.read_excel(decrypted_data, sheet_name='Ha Noi', engine='openpyxl', header=0)
                self.df = pd.concat([df_hcm, df_hanoi], ignore_index=True)
            else:
                self.df = pd.read_excel(decrypted_data, sheet_name=sheet_name, engine='openpyxl', header=0)
            
            self.df = self.df.dropna(how='all')
            self.df.columns = [col.strip() if isinstance(col, str) else col for col in self.df.columns]
            
            if 'Trạng thái check-in' not in self.df.columns:
                self.df['Trạng thái check-in'] = ''
            if 'Thời gian check-in' not in self.df.columns:
                self.df['Thời gian check-in'] = ''
            
            self.save_data()
            print(f"Đã tạo file mới: {self.working_file}")
            return True
        except Exception as e:
            print(f"Lỗi: {e}")
            return False
    
    def save_data(self):
        """Save dataframe to Excel file"""
        if self.df is not None and self.working_file:
            self.df.to_excel(self.working_file, index=False)
    
    def parse_qr_code(self, qr_content):
        """Parse QR code content"""
        try:
            # Hỗ trợ nhiều format: 'ID-Name', 'ID - Name', 'ID  -  Name'
            # Tìm dấu gạch ngang đầu tiên
            if '-' in qr_content:
                idx = qr_content.index('-')
                employee_id = qr_content[:idx].strip()
                name = qr_content[idx+1:].strip()
                if employee_id and name:
                    return employee_id, name
            return None, None
        except:
            return None, None
    
    def check_in(self, employee_id, name):
        """Mark attendance in the Excel file"""
        if self.df is None:
            return {'success': False, 'message': 'Chưa load dữ liệu'}
        
        mask = self.df['Mã nhân viên'].astype(str).str.strip() == str(employee_id).strip()
        matching_rows = self.df[mask]
        
        if len(matching_rows) == 0:
            return {
                'success': False,
                'message': f'❌ KHÔNG TÌM THẤY: {employee_id}'
            }
        
        idx = matching_rows.index[0]
        actual_name = self.df.loc[idx, 'Tên Trên Thiệp']
        khu_vuc = self.df.loc[idx, 'Khu vực']
        
        if self.df.loc[idx, 'Trạng thái check-in'] == 'Đã check-in':
            return {
                'success': False,
                'message': '⚠️ ĐÃ CHECK-IN TRƯỚC ĐÓ!',
                'employee_id': employee_id,
                'name': actual_name,
                'area': khu_vuc,
                'time': self.df.loc[idx, 'Thời gian check-in']
            }
        
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self.df.loc[idx, 'Trạng thái check-in'] = 'Đã check-in'
        self.df.loc[idx, 'Thời gian check-in'] = current_time
        self.save_data()
        
        return {
            'success': True,
            'message': '✅ CHECK-IN THÀNH CÔNG!',
            'employee_id': employee_id,
            'name': actual_name,
            'area': khu_vuc,
            'time': current_time
        }
    
    def get_statistics(self):
        """Get check-in statistics"""
        if self.df is None:
            return None
        
        total = len(self.df)
        checked_in = len(self.df[self.df['Trạng thái check-in'] == 'Đã check-in'])
        not_checked_in = total - checked_in
        
        return {
            'total': total,
            'checked_in': checked_in,
            'pending': not_checked_in,
            'not_checked_in': not_checked_in,
            'percentage': round(checked_in/total*100, 1) if total > 0 else 0
        }
    
    def get_recent_checkins(self, limit=10):
        """Get recent check-ins"""
        if self.df is None:
            return []
        
        # Lọc các dòng đã check-in và có thời gian
        checked = self.df[self.df['Trạng thái check-in'] == 'Đã check-in'].copy()
        
        if len(checked) == 0:
            return []
        
        # Sắp xếp theo thời gian check-in (mới nhất trước)
        checked = checked.sort_values('Thời gian check-in', ascending=False)
        
        # Lấy limit dòng đầu
        recent = []
        for idx, row in checked.head(limit).iterrows():
            recent.append({
                'code': str(row['Mã nhân viên']),
                'name': str(row['Tên Trên Thiệp']),
                'time': str(row['Thời gian check-in'])
            })
        
        return recent

# Global app instance
checkin_app = WebCheckInApp()

# Store latest check-in for display
latest_checkin = {'success': False, 'time': None}

@app.route('/')
def index():
    """Home page - select area"""
    return render_template('index.html')

@app.route('/checkin/<sheet>')
def checkin_page(sheet):
    """Check-in page with dual cameras"""
    if sheet not in ['HCM', 'Ha Noi', 'ALL']:
        return "Invalid sheet", 400
    
    if not checkin_app.load_sheet(sheet):
        return "Không thể load dữ liệu", 500
    
    return render_template('checkin.html', sheet=sheet)

@app.route('/display/<sheet>')
@app.route('/display/<sheet>/<int:channel>')
def display_page(sheet, channel=0):
    """Display page for welcome screen"""
    if sheet not in ['HCM', 'Ha Noi', 'ALL']:
        return "Invalid sheet", 400
    
    return render_template('display.html', sheet=sheet, channel=channel)

@app.route('/api/checkin', methods=['POST'])
def api_checkin():
    """API endpoint for check-in"""
    global latest_checkin
    
    data = request.json
    qr_code = data.get('qr_code', '') or data.get('code', '')
    
    employee_id, name = checkin_app.parse_qr_code(qr_code)
    
    if not employee_id or not name:
        return jsonify({
            'success': False,
            'message': '❌ FORMAT KHÔNG HỢP LỆ. Định dạng chuẩn: "Mã nhân viên - Tên trên thiệp"'
        })
    
    result = checkin_app.check_in(employee_id, name)
    
    # Store latest successful check-in for display
    if result.get('success'):
        latest_checkin = result.copy()
        # Broadcast to both display channels via SSE
        camera_index = data.get('camera_index', 0)
        if camera_index == 0:
            checkin_queue_0.put(result)
        else:
            checkin_queue_1.put(result)
    
    return jsonify(result)

@app.route('/api/statistics')
@app.route('/api/stats')
def api_statistics():
    """API endpoint for statistics"""
    stats = checkin_app.get_statistics()
    if stats:
        return jsonify(stats)
    return jsonify({'error': 'No data loaded'}), 400

@app.route('/api/recent')
def api_recent_checkins():
    """API endpoint for recent check-ins"""
    recent = checkin_app.get_recent_checkins(limit=10)
    return jsonify({'recent': recent})

@app.route('/api/latest-checkin')
def api_latest_checkin():
    """API endpoint for latest check-in (for display)"""
    return jsonify(latest_checkin)

@app.route('/api/download')
def download_file():
    """Download the working file"""
    if checkin_app.working_file and os.path.exists(checkin_app.working_file):
        return send_file(checkin_app.working_file, as_attachment=True)
    return "File not found", 404

@app.route('/api/checkin-stream')
@app.route('/api/checkin-stream/<int:channel>')
def checkin_stream(channel=0):
    """Server-Sent Events endpoint for real-time check-in updates"""
    # Select the appropriate queue based on channel
    selected_queue = checkin_queue_0 if channel == 0 else checkin_queue_1
    
    def generate():
        # Send initial connection message
        yield "data: " + json.dumps({'type': 'connected', 'channel': channel}) + "\n\n"
        
        # Keep connection alive and send check-in events
        while True:
            try:
                # Wait for new check-in event (with timeout)
                data = selected_queue.get(timeout=30)
                event_data = json.dumps(data)
                yield f"data: {event_data}\n\n"
            except:
                # Send heartbeat to keep connection alive
                yield "data: " + json.dumps({'type': 'heartbeat'}) + "\n\n"
    
    return Response(generate(), mimetype='text/event-stream')

@app.route('/api/opencv-stream/<int:camera_index>')
def opencv_stream(camera_index):
    """OpenCV camera video stream endpoint"""
    return Response(generate_opencv_frames(camera_index),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/api/opencv-qr/<int:camera_index>')
def opencv_qr_detection(camera_index):
    """Get last detected QR code from OpenCV camera"""
    if camera_index in opencv_last_qr:
        qr_data = opencv_last_qr[camera_index]
        current_time = time.time()
        
        # Return QR code if detected within last 1 second
        if qr_data['qr_code'] and (current_time - qr_data['time'] < 1):
            return jsonify({'qr_code': qr_data['qr_code']})
    
    return jsonify({'qr_code': None})

if __name__ == '__main__':
    # Disable cache in development mode only
    app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
    app.config['TEMPLATES_AUTO_RELOAD'] = True
    app.jinja_env.auto_reload = True
    app.config['TEMPLATE_AUTO_RELOAD'] = True
    
    @app.after_request
    def add_header(response):
        """Disable caching for all responses in development"""
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response
    
    app.run(debug=True, host='0.0.0.0', port=5000, threaded=True)
