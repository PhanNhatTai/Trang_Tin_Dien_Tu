var express = require('express');
var router = express.Router();

const { db } = require('../firebase'); 
const kiemTraQuyenAdmin = (req, res, next) => {
    if (req.session && req.session.QuyenHan === 'admin') {
        return next();
    }
    res.redirect('/'); 
}
// GET: Danh sách chủ đề
router.get('/',kiemTraQuyenAdmin, async (req, res) => {
    try {
        const snapshot = await db.collection('chude').get();
        const cd = [];
        snapshot.forEach(doc => {
            cd.push({ id: doc.id, ...doc.data() });
        });  
        res.render('chude', {
            title: 'Danh sách chủ đề',
            chude: cd
        });
    } catch (error) {
        console.error("Lỗi lấy danh sách:", error);
        res.status(500).send("Lỗi hệ thống");
    }
});

// GET: Thêm chủ đề 
router.get('/them',kiemTraQuyenAdmin, (req, res) => {
    res.render('chude_them', {
        title: 'Thêm chủ đề'
    });
});

// POST: Thêm chủ đề
router.post('/them', async (req, res) => {
    try {
        var data = {
            TenChuDe: req.body.TenChuDe
        };     
        await db.collection('chude').add(data);
        res.redirect('/chude');
    } catch (error) {
        console.error("Lỗi thêm chủ đề:", error);
        res.redirect('/chude');
    }
});

// GET: Sửa chủ đề 
router.get('/sua/:id',kiemTraQuyenAdmin, async (req, res) => {
    try {
        var id = req.params.id;     
        const doc = await db.collection('chude').doc(id).get();      
        if (!doc.exists) {
            return res.status(404).send('Không tìm thấy chủ đề');
        }
        res.render('chude_sua', {
            title: 'Sửa chủ đề',
            chude: { id: doc.id, ...doc.data() }
        });
    } catch (error) {
        console.error("Lỗi lấy dữ liệu sửa:", error);
        res.redirect('/chude');
    }
});

// POST: Sửa chủ đề 
router.post('/sua/:id', async (req, res) => {
    try {
        var id = req.params.id;
        var data = {
            TenChuDe: req.body.TenChuDe
        };
        await db.collection('chude').doc(id).update(data);
        res.redirect('/chude');
    } catch (error) {
        console.error("Lỗi cập nhật:", error);
        res.redirect('/chude');
    }
});

// GET: Xóa chủ đề
router.get('/xoa/:id',kiemTraQuyenAdmin, async (req, res) => {
    try {
        var id = req.params.id;
     
        await db.collection('chude').doc(id).delete();
        res.redirect('/chude');
    } catch (error) {
        console.error("Lỗi xóa:", error);
        res.redirect('/chude');
    }
});

module.exports = router;