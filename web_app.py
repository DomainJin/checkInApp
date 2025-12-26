from flask import Flask, render_template, request, jsonify, send_file
import pandas as pd
import msoffcrypto
import io
from datetime import datetime
import os

app = Flask(__name__)

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
    
    def load_sheet(self, sheet_name):
        """Load data from Excel sheet"""
        self.sheet_name = sheet_name
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
            parts = qr_content.split(' - ')
            if len(parts) == 2:
                employee_id = parts[0].strip()
                name = parts[1].strip()
                return employee_id, name
            else:
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
            'not_checked_in': not_checked_in,
            'percentage': round(checked_in/total*100, 1) if total > 0 else 0
        }

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
    """Check-in page with camera"""
    if sheet not in ['HCM', 'Ha Noi', 'ALL']:
        return "Invalid sheet", 400
    
    if not checkin_app.load_sheet(sheet):
        return "Không thể load dữ liệu", 500
    
    return render_template('checkin.html', sheet=sheet)

@app.route('/display/<sheet>')
def display_page(sheet):
    """Display page for welcome screen"""
    if sheet not in ['HCM', 'Ha Noi', 'ALL']:
        return "Invalid sheet", 400
    
    return render_template('display.html', sheet=sheet)

@app.route('/api/checkin', methods=['POST'])
def api_checkin():
    """API endpoint for check-in"""
    global latest_checkin
    
    data = request.json
    qr_code = data.get('qr_code', '')
    
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
    
    return jsonify(result)

@app.route('/api/statistics')
def api_statistics():
    """API endpoint for statistics"""
    stats = checkin_app.get_statistics()
    if stats:
        return jsonify(stats)
    return jsonify({'error': 'No data loaded'}), 400

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

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
