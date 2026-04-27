var express = require('express');
var router = express.Router();
var bcrypt = require('bcryptjs');
const { db } = require('../firebase'); 
const kiemTraQuyenAdmin = (req, res, next) => {
    if (req.session && req.session.QuyenHan === 'admin') {
        return next();
    }
    res.redirect('/'); 
}
// GET: Danh sách tài khoản
router.get('/',kiemTraQuyenAdmin, async (req, res) => {
    try {
        const snapshot = await db.collection('taikhoan').get();
        const tk = [];
        snapshot.forEach(doc => {
            tk.push({ id: doc.id, ...doc.data() });
        });
        res.render('taikhoan', { title: 'Danh sách tài khoản', taikhoan: tk });
    } catch (error) {
        res.redirect('/error');
    }
});

//Get: Thêm tài khoản
router.get('/them',kiemTraQuyenAdmin, (req, res) => {
    res.render('taikhoan_them', { title: 'Thêm tài khoản' });
});

// POST: Thêm tài khoản
router.post('/them', async (req, res) => {
    try {
        const { TenDangNhap, MatKhau,XacNhanMatKhau, HoVaTen } = req.body;
        if (MatKhau !== XacNhanMatKhau) {
            return res.render('dangky', { 
                title: 'Đăng ký',
                error: 'Mật khẩu và xác nhận mật khẩu không khớp!'
                });
        }
        const userCheck = await db.collection('taikhoan')
            .where('TenDangNhap', '==', TenDangNhap)
            .get();
        if (!userCheck.empty) {
            return res.render('dangky', { 
                title: 'Đăng ký',
                error: 'Tên đăng nhập này đã có người sử dụng. Vui lòng chọn tên khác!',
                oldData: req.body
            });
        }
        const salt = bcrypt.genSaltSync(10);
        const data = {
            HoVaTen: req.body.HoVaTen,
            Email: req.body.Email,
            HinhAnh: req.body.HinhAnh || "",
            TenDangNhap: req.body.TenDangNhap,
            MatKhau: bcrypt.hashSync(req.body.MatKhau, salt),
            QuyenHan: req.body.QuyenHan, 
            KichHoat: 1     
        };
        await db.collection('taikhoan').add(data);
        res.redirect('/taikhoan');
    } catch (error) {
        console.error(error);
        res.redirect('/error');
    }
});

router.get('/hoso', async (req, res) => {
    try {
        if (!req.session || !req.session.MaNguoiDung) {
            console.log("Chưa đăng nhập, không tìm thấy MaNguoiDung trong Session");
            return res.redirect('/dangnhap'); 
        }
        const userId = req.session.MaNguoiDung;
        const userDoc = await db.collection('taikhoan').doc(userId).get();
        if (!userDoc.exists) {
            return res.send("Tài khoản không tồn tại trên hệ thống!");
        }
        const userData = userDoc.data();
        res.render('hoso', {
            title: 'Hồ sơ của tôi',
            user: { id: userDoc.id, ...userData }
        });
    } catch (error) {
        console.error("Lỗi trang hồ sơ:", error);
        res.redirect('/');
    }
});

router.post('/capnhat-hoso', async (req, res) => {
    try {
        const userId = req.session.MaNguoiDung;
        if (!userId) return res.redirect('/dangnhap');
        const data = {
            HoVaTen: req.body.HoVaTen,
            Email: req.body.Email || "",
            HinhAnh: req.body.HinhAnh || "",
            TenDangNhap: req.body.TenDangNhap
        };
        await db.collection('taikhoan').doc(userId).update(data);
        req.session.HinhAnh = data.HinhAnh;
        req.session.TenDangNhap = data.TenDangNhap;
        res.send("<script>alert('Cập nhật thông tin thành công!'); window.location.href='/taikhoan/hoso';</script>");
    } catch (error) {
        console.error(error);
        res.status(500).send("Lỗi cập nhật hệ thống");
    }
});

router.post('/doimatkhau', async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.session.MaNguoiDung; 
    if (!userId) return res.redirect('/dangnhap');
    try {
        const userDoc = await db.collection('taikhoan').doc(userId).get();
        if (!userDoc.exists) return res.send("Tài khoản không tồn tại");
        const user = userDoc.data();
        const isMatch = await bcrypt.compare(oldPassword, user.MatKhau);
        if (!isMatch) {
            return res.send("<script>alert('Mật khẩu cũ không chính xác!'); window.history.back();</script>");
        }
        const salt = await bcrypt.genSalt(10);
        const hashedNewPassword = await bcrypt.hash(newPassword, salt);
        await db.collection('taikhoan').doc(userId).update({
            MatKhau: hashedNewPassword
        });
        res.send("<script>alert('Đổi mật khẩu thành công!'); window.location.href='/taikhoan/hoso';</script>");
    } catch (error) {
        console.error("Lỗi đổi mật khẩu:", error);
        res.status(500).send("Lỗi hệ thống");
    }
});

// GET: Sửa tài khoản
router.get('/sua/:id',kiemTraQuyenAdmin, async (req, res) => {
    try {
        const id = req.params.id;
        const doc = await db.collection('taikhoan').doc(id).get();
        if (!doc.exists) {
            return res.status(404).send('Không tìm thấy tài khoản');
        }
        const tk = { id: doc.id, ...doc.data() };
        res.render('taikhoan_sua', {
            title: 'Sửa tài khoản',
            taikhoan: tk
        });
    } catch (error) {
        console.error(error);
        res.redirect('/error');
    }
});

// POST: Sửa tài khoản (Xử lý lưu thay đổi)
router.post('/sua/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const salt = bcrypt.genSaltSync(10);
        const data = {
            HoVaTen: req.body.HoVaTen,
            Email: req.body.Email ,
            HinhAnh: req.body.HinhAnh || "", 
            TenDangNhap: req.body.TenDangNhap,
            QuyenHan: req.body.QuyenHan,
            KichHoat: parseInt(req.body.KichHoat) 
        };

        if (req.body.MatKhau) {
            data['MatKhau'] = bcrypt.hashSync(req.body.MatKhau, salt);
        }
        await db.collection('taikhoan').doc(id).update(data);
        res.redirect('/taikhoan');
    } catch (error) {
        console.error(error);
        res.redirect('/error');
    }
});

// GET: Xóa tài khoản
router.get('/xoa/:id',kiemTraQuyenAdmin, async (req, res) => {
    try {
        const id = req.params.id;
        const doc = await db.collection('taikhoan').doc(id).get();
        if (!doc.exists) {
            return res.send("Tài khoản không tồn tại!");
        }
        const user = { id: doc.id, ...doc.data() };
        res.render('taikhoan_xoa', { 
            title: 'Xác nhận xóa', 
            user: user 
        });
    } catch (error) {
        res.redirect('/error');
    }
});

router.post('/xoa/:id', async (req, res) => {
    try {
        const id = req.params.id;
        await db.collection('taikhoan').doc(id).delete();
        if (req.session.MaNguoiDung === id) {
            req.session.destroy();
            return res.send("<script>alert('Tài khoản của bạn đã bị xóa!'); window.location.href='/';</script>");
        }
        res.redirect('/taikhoan');
    } catch (error) {
        console.error(error);
        res.redirect('/error');
    }
});

module.exports = router;