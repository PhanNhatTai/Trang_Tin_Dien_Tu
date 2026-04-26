var express = require('express');
var router = express.Router();
const { db } = require('../firebase');
function layAnhDauTien(content) {
    const regex = /<img.*?src="(.*?)"/; 
    const match = content.match(regex);
    return match ? match[1] : "/images/noimage.png"; 
}
router.get('/', async (req, res) => {
    try {
        const snapshot = await db.collection('baiviet').where('KiemDuyet', '==', 1).orderBy('NgayDang', 'desc').get();
        const tinDaDoc = req.session.history || [];
        const dsBaiViet = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                HinhAnhDauTien: layAnhDauTien(data.NoiDung || "") 
            };
        });
        const tinNoiBat = [...dsBaiViet].sort((a, b) => (b.LuotXem || 0) - (a.LuotXem || 0)).slice(0, 3);
        const page = parseInt(req.query.page) || 1;
        const limit = 9; 
        const skip = (page - 1) * limit;
        const totalPages = Math.ceil(dsBaiViet.length / limit);
        const ketQuaPhanTrang = dsBaiViet.slice(skip, skip + limit);
        res.render('index', { 
            title: 'Trang chủ', 
            baiviet: ketQuaPhanTrang,
            currentPage: page,
            tinNoiBat: tinNoiBat,
            tinDaDoc: tinDaDoc.slice(0, 3),
            totalPages: totalPages
        });
    } catch (error) {
        console.error("Lỗi lấy bài viết:", error);
        res.render('index', { 
            title: 'Trang chủ', 
            baiviet: [], 
            currentPage: 1, 
            tinNoiBat: [], 
            tinDaDoc: [], 
            totalPages: 0 
        });
    }
});


router.get('/error', async (req, res) => {
	res.render('error', {
		title: 'Lỗi'
	});
});

router.get('/success', async (req, res) => {
	res.render('success', {
		title: 'Hoàn thành'
	});
});
router.use(async (req, res, next) => {
    const snapshot = await db.collection('chude').get();
    res.locals.dsChuDe = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    next();
});

// GET: Lọc bài viết theo tên chủ đề
router.get('/chude/:ten', async (req, res) => {
    try {
        const tinDaDoc = req.session.history || [];
        const tenChuDe = req.params.ten;
        const page = parseInt(req.query.page) || 1;
        const limit = 9; 
        const skip = (page - 1) * limit;
        const snapshot = await db.collection('baiviet')
            .where('TenChuDe', '==', tenChuDe) 
            .get();
          const dsBaiViet = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                HinhAnhDauTien: layAnhDauTien(data.NoiDung || "") 
            };
        });
        const tinNoiBat = [...dsBaiViet].sort((a, b) => (b.LuotXem || 0) - (a.LuotXem || 0)).slice(0, 3);
        const totalPosts = dsBaiViet.length;
        const totalPages = Math.ceil(totalPosts / limit);
        const ketQuaPhanTrang = dsBaiViet.slice(skip, skip + limit);
        res.render('index', { 
            title: 'Chuyên mục: ' + tenChuDe, 
            baiviet: ketQuaPhanTrang,
            currentPage: page,
            tinNoiBat: tinNoiBat,
            tinDaDoc: tinDaDoc.slice(0, 3),
            totalPages: totalPages,
            currentTenChuDe: tenChuDe 
        });
    } catch (error) {
        console.error("Lỗi lọc chủ đề:", error);
        res.redirect('/error');
    }
});

router.get('/lich-su-doc', (req, res) => {
    res.render('index', {
        title: 'Lịch sử bài viết đã đọc',
        baiviet: req.session.history || [], 
        currentPage: 1,
        totalPages: 1,
        tinNoiBat: [], 
        tinDaDoc: []   
    });
});

module.exports = router;