var express = require('express');
var router = express.Router();
const admin = require('firebase-admin');
const { db } = require('../firebase');

function layAnhDauTien(content) {
    const regex = /<img.*?src="(.*?)"/; 
    const match = content.match(regex);
    return match ? match[1] : "/images/noimage.png"; 
}
const kiemTraQuyenAdmin = (req, res, next) => {
    if (req.session && req.session.QuyenHan === 'admin') {
        return next();
    }
    res.redirect('/'); 
}
// GET: Danh sách bài viết
router.get('/',kiemTraQuyenAdmin, async (req, res) => {
    try {
        const bvSnapshot = await db.collection('baiviet').get();
        const bv = await Promise.all(bvSnapshot.docs.map(async (doc) => {
            const data = doc.data();
            let hienThiChuDe = data.TenChuDe || "Chưa phân loại";
            let tenNguoiDang = "Ẩn danh";
            if (data.MaTaiKhoan) {
                const tkDoc = await db.collection('taikhoan').doc(data.MaTaiKhoan).get();
                if (tkDoc.exists) tenNguoiDang = tkDoc.data().TenDangNhap;
            }
            return {
                id: doc.id,
                ...data,
                TenChuDeHienThi: hienThiChuDe,
                TaiKhoan: { TenDangNhap: tenNguoiDang },
                NgayHienThi: data.NgayDang ? data.NgayDang.toDate().toLocaleDateString('vi-VN') : 'Chưa có ngày'
            };
        }));
        res.render('baiviet', { title: 'Danh sách bài viết', baiviet: bv });
    } catch (error) {
        console.error("Lỗi:", error);
        res.redirect('/error');
    }
});

// GET: Đăng bài viết 
router.get('/them', async (req, res) => {
    try {
        const snapshot = await db.collection('chude').get();
        const maNguoiDung = req.session.MaNguoiDung;
        if (!maNguoiDung) return res.redirect('/dangnhap');
        const cd = [];
        snapshot.forEach(doc => {
            cd.push({ id: doc.id, ...doc.data() });
        });
        res.render('baiviet_them', { title: 'Đăng bài viết', chude: cd });
    } catch (error) {
        res.redirect('/error');
    }
});

// POST: Đăng bài viết (Xử lý lưu dữ liệu)
router.post('/them', async (req, res) => {
    try {
        const maND = req.session.MaNguoiDung;
        const data = {
            TenChuDe: req.body.TenChuDe, 
            TieuDe: req.body.TieuDe,
            TomTat: req.body.TomTat,
            NoiDung: req.body.NoiDung,
            TenDangNhap: req.session.TenDangNhap,
            MaTaiKhoan: maND,
            NgayDang: new Date(),
            KiemDuyet: 0
        };
        await db.collection('baiviet').add(data);
        res.render('success', { title: 'Hoàn thành', message: 'Đã đăng bài thành công!' });
    } catch (error) {
        console.error("Lỗi:", error);
        res.render('error', { title: 'Lỗi', message: 'Có lỗi xảy ra' });
    }
});

router.get('/cuatoi', async (req, res) => {
    try {
        const maNguoiDung = req.session.MaNguoiDung;
        if (!maNguoiDung) return res.redirect('/dangnhap');
        const snapshot = await db.collection('baiviet')
            .where('MaTaiKhoan', '==', maNguoiDung)
            .get();
        const dsBaiViet = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            let tenHienThi = data.TenChuDe || "Chưa phân loại";
            dsBaiViet.push({
                id: doc.id,
                ...data,
                TenChuDeHienThi: tenHienThi,
                NgayHienThi: data.NgayDang && typeof data.NgayDang.toDate === 'function'
                    ? data.NgayDang.toDate().toLocaleDateString('vi-VN')
                    : "Chưa có ngày",
                TomTatHienThi: data.NoiDung ? data.NoiDung.replace(/<[^>]*>/g, '').substring(0, 50) + '...' : '...'
            });
        });
        res.render('baiviet_cuatoi', { title: 'Bài viết của tôi', baiviet: dsBaiViet });
    } catch (error) {
        res.render('error', { title: 'Lỗi', message: 'Không thể kết nối dữ liệu' });
    }
});

router.get('/xoa/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const maNguoiDung = req.session.MaNguoiDung;
        if (!maNguoiDung) return res.redirect('/dangnhap');
        await db.collection('baiviet').doc(id).delete();
        res.redirect('/baiviet');
    } catch (error) {
        res.redirect('/error');
    }
});

router.get('/duyet/:id',kiemTraQuyenAdmin, async (req, res) => {
    try {
        const id = req.params.id;
        const doc = await db.collection('baiviet').doc(id).get();
        if (doc.exists) {
            const status = doc.data().KiemDuyet == 1 ? 0 : 1;
            await db.collection('baiviet').doc(id).update({ KiemDuyet: status });
        }
        res.redirect('/baiviet');
    } catch (error) {
        res.redirect('/error');
    }
});

// GET: Chi tiết bài viết
router.get('/chitiet/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const docRef = db.collection('baiviet').doc(id);
        const doc = await docRef.get();
        if (!doc.exists) {
            return res.status(404).send('Bài viết không tồn tại');
        }
        //Tự động tăng lượt xem
        await docRef.update({
            LuotXem: admin.firestore.FieldValue.increment(1)
        });
        const updatedDoc = await docRef.get();
        const data = updatedDoc.data();
        const blSnapshot = await db.collection('binhluan')
            .where('MaBaiViet', '==', id)
            .orderBy('NgayBinhLuan', 'desc')
            .get();
        const dsBinhLuan = [];
        blSnapshot.forEach(blDoc => {
            const blData = blDoc.data();
            dsBinhLuan.push({
                id: blDoc.id,
                ...blData,
                HinhAnh: blData.HinhAnh || null,
                NgayHienThi: blData.NgayBinhLuan ? (blData.NgayBinhLuan.toDate ? blData.NgayBinhLuan.toDate().toLocaleString('vi-VN') : new Date(blData.NgayBinhLuan).toLocaleString('vi-VN')) : ''
            });
        });
        let ngayDangHienThi = "Đang cập nhật";
        if (data.NgayDang) {
            const dateObj = data.NgayDang.toDate ? data.NgayDang.toDate() : new Date(data.NgayDang);
            ngayDangHienThi = dateObj.toLocaleString('vi-VN');
        }
        const bv = {
            id: updatedDoc.id,
            ...data,
            NgayDang: ngayDangHienThi,
            HinhAnhDauTien: data.HinhAnhDauTien || (typeof layAnhDauTien === 'function' ? layAnhDauTien(data.NoiDung) : '/images/noimage.png')
        };
        if (!req.session.history) {
            req.session.history = [];
        }
        const index = req.session.history.findIndex(item => item.id === id);
        if (index !== -1) {
            req.session.history.splice(index, 1);
        }
        req.session.history.unshift({
            id: bv.id,
            TieuDe: bv.TieuDe,
            HinhAnhDauTien: bv.HinhAnhDauTien,
            TomTat: bv.TomTat || ""
        });
        if (req.session.history.length > 10) {
            req.session.history.pop();
        }
        res.render('baiviet_chitiet', {
            title: bv.TieuDe,
            baiviet: bv,
            binhluan: dsBinhLuan,
            tenNguoiDung: req.session.TenDangNhap || null,
            quyenHan: req.session.QuyenHan || 'user'
        });
    } catch (error) {
        console.error("Lỗi chi tiết bài viết:", error);
        res.redirect('/error');
    }
});

// GET: Hiển thị trang sửa bài viết
router.get('/sua/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const maNguoiDung = req.session.MaNguoiDung;
        if (!maNguoiDung) return res.redirect('/dangnhap');
        const doc = await db.collection('baiviet').doc(id).get();
        if (!doc.exists) {
            return res.status(404).send('Không tìm thấy bài viết');
        }
        const bv = { id: doc.id, ...doc.data() };
        const snapshotChuDe = await db.collection('chude').get();
        const dsChuDe = snapshotChuDe.docs.map(d => ({ id: d.id, ...d.data() }));
        res.render('baiviet_sua', {
            title: 'Sửa bài viết',
            baiviet: bv,
            dsChuDe: dsChuDe,
            req: req
        });
    } catch (error) {
        console.error("Lỗi lấy dữ liệu sửa:", error);
        res.redirect('/baiviet');
    }
});

// POST: Cập nhật dữ liệu bài viết
router.post('/sua/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const data = {
            TieuDe: req.body.TieuDe,
            TomTat: req.body.TomTat,
            NoiDung: req.body.NoiDung,
            TenChuDe: req.body.TenChuDe, 
        };
const returnUrl = req.body.returnUrl || '/';
        await db.collection('baiviet').doc(id).update(data);
        res.redirect(returnUrl); 
    } catch (error) {
        console.error("Lỗi cập nhật bài viết:", error);
        res.redirect('/baiviet');
    }
});

router.post('/binhluan/:id', async (req, res) => {
    try {
        const idBaiViet = req.params.id;
        const maND = req.session.MaNguoiDung || null;
        const tenDN = req.session.TenDangNhap || null;
        const hoTenTuSession = req.session.HoTen || null;
        const hinhAnhTuSession = req.session.HinhAnh || null;
        const { HoTen, NoiDungBL } = req.body;
        const tenHienThi = hoTenTuSession || tenDN || HoTen || "Người dùng ẩn danh";
        await db.collection('binhluan').add({
            MaBaiViet: idBaiViet,
            MaTaiKhoan: maND,    
            HoTen: tenHienThi,     
            TenDangNhap: tenDN,    
            HinhAnh: hinhAnhTuSession,
            NoiDungBL: NoiDungBL,
            NgayBinhLuan: new Date() 
        });
        res.redirect(`/baiviet/chitiet/${idBaiViet}`);
    } catch (error) {
        console.error("Lỗi gửi bình luận:", error);
        res.status(500).send("Có lỗi xảy ra khi gửi bình luận.");
    }
});

router.get('/binhluan/xoa/:id', async (req, res) => {
    try {
        const idBL = req.params.id;
        const idBaiViet = req.query.idBaiViet;
        await db.collection('binhluan').doc(idBL).delete();
        
        res.redirect(`/baiviet/chitiet/${idBaiViet}`);
    } catch (error) {
        res.redirect('/error');
    }
});

router.post('/binhluan/sua/:id', async (req, res) => {
    try {
        const idBL = req.params.id;
        const { NoiDungMoi, idBaiViet } = req.body;
        await db.collection('binhluan').doc(idBL).update({
            NoiDungBL: NoiDungMoi,
            NgaySua: new Date() 
        });
        res.redirect(`/baiviet/chitiet/${idBaiViet}`);
    } catch (error) {
        res.redirect('/error');
    }
});

module.exports = router;