var express = require('express');
var router = express.Router();
const { db } = require('../firebase');
var bcrypt = require('bcryptjs');
const { render } = require('ejs');

// GET: Đăng ký
router.get('/dangky', (req, res) => {
    res.render('dangky', { title: 'Đăng ký tài khoản' });
});

// POST: Đăng ký 
router.post('/dangky', async (req, res) => {
    try {
        const { TenDangNhap, MatKhau,XacNhanMatKhau, HoVaTen } = req.body;
        if (MatKhau !== XacNhanMatKhau) {
            return res.render('dangky', { 
                title: 'Đăng ký',
                error: 'Mật khẩu và xác nhận mật khẩu không khớp!'
                });
        }
        //Kiểm tra xem TenDangNhap đã tồn tại hay chưa
        const userCheck = await db.collection('taikhoan')
            .where('TenDangNhap', '==', TenDangNhap)
            .get();

        if (!userCheck.empty) {
        //Nếu đã tồn tại trả về thông báo lỗi
            return res.render('dangky', { 
                title: 'Đăng ký',
                error: 'Tên đăng nhập này đã có người sử dụng. Vui lòng chọn tên khác!',
            });
        }
        
        const salt = bcrypt.genSaltSync(10);
        const data = {
            HoVaTen: req.body.HoVaTen,
            Email: req.body.Email,
            HinhAnh: req.body.HinhAnh || "",
            TenDangNhap: req.body.TenDangNhap,
            MatKhau: bcrypt.hashSync(req.body.MatKhau, salt),
            QuyenHan: "user", 
            KichHoat: 1       
        };
        const docRef = await db.collection('taikhoan').add(data);
        req.session.MaNguoiDung = docRef.id; 
        req.session.HoVaTen = data.HoVaTen;
        req.session.QuyenHan = data.QuyenHan;
        req.session.TenDangNhap = data.TenDangNhap;
        req.session.HinhAnh = data.HinhAnh;
        req.session.save(() => {
            res.redirect('/');
        });
    } catch (error) {
        console.error("Lỗi đăng ký:", error);
    res.render('dangky', { 
        title: 'Đăng ký', 
        error: 'Có lỗi hệ thống xảy ra.'
    });
}
});

// GET: Đăng nhập
router.get('/dangnhap', (req, res) => {

    if (req.session.MaNguoiDung) {
        return res.redirect('/');
    }
    res.render('dangnhap', { title: 'Đăng nhập' });
});

// POST: Đăng nhập
router.post('/dangnhap', async (req, res) => {
    try {
        const { TenDangNhap, MatKhau } = req.body;
        const snapshot = await db.collection('taikhoan')
            .where('TenDangNhap', '==', TenDangNhap)
            .limit(1)
            .get();
        if (snapshot.empty) {
            return res.render('dangnhap', { title: 'Đăng nhập', error: 'Sai tên đăng nhập' });
        }
        const userDoc = snapshot.docs[0];
        const user = { id: userDoc.id, ...userDoc.data() };
        const isMatch = bcrypt.compareSync(MatKhau, user.MatKhau);
        if (!isMatch) {
            return res.render('dangnhap', { title: 'Đăng nhập', error: 'Sai mật khẩu' });
        }
        if (user.KichHoat === 0) {
            return res.render('dangnhap', { title: 'Đăng nhập', error: 'Tài khoản bị khóa' });
        }
        req.session.MaNguoiDung = user.id;
        req.session.HoVaTen = user.HoVaTen;
        req.session.QuyenHan = user.QuyenHan;
        req.session.TenDangNhap = user.TenDangNhap;
        req.session.HinhAnh = user.HinhAnh;
        req.session.save(() => {
            res.redirect('/');
        });

    } catch (error) {
        console.error("Lỗi đăng nhập chi tiết:", error);
        res.render('error', {
            title: 'Lỗi hệ thống',
            message: 'Rất tiếc, hệ thống đang gặp sự cố kỹ thuật.'
        });
    }
});

// GET: Đăng xuất 
router.get('/dangxuat', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return console.log(err);
        }
        res.redirect('/');
    });
});

module.exports = router;