var express = require('express');
var router = express.Router();
const { db } = require('../firebase');
function loaiBoDau(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
}
function layAnhDauTien(content) {
    const regex = /<img.*?src="(.*?)"/; 
    const match = content.match(regex);
    return match ? match[1] : "/images/noimage.png"; 
}

router.get('/', async (req, res) => {
    try {
        const tinDaDoc = req.session.history || [];
        const tuKhoa = req.query.q;
        if (!tuKhoa) return res.redirect('/');
        const page = parseInt(req.query.page) || 1;
        const limit = 9; 
        const skip = (page - 1) * limit;
        const snapshot = await db.collection('baiviet').where('KiemDuyet', '==', 1).get();
        const tatCa = snapshot.docs.map(doc => {
            const data = doc.data();
            return { 
                id: doc.id, 
                ...data,
                HinhAnhDauTien: layAnhDauTien(data.NoiDung || "") 
            };
        });
        const tuKhoaSach = loaiBoDau(tuKhoa);
        const ketQua = tatCa.filter(bv =>
            loaiBoDau(bv.TieuDe || "").includes(tuKhoaSach)
        );
        const totalPosts = ketQua.length;
        const totalPages = Math.ceil(totalPosts / limit);
        const ketQuaPhanTrang = ketQua.slice(skip, skip + limit);
        res.render('index', {
            title: 'Kết quả: ' + tuKhoa,
            baiviet: ketQuaPhanTrang,
            currentPage: page,
            tinDaDoc: tinDaDoc.slice(0, 3),
            totalPages: totalPages,
            tuKhoa: tuKhoa 
        });
    } catch (error) {
        console.error("Lỗi:", error);
        res.redirect('/');
    }
});

module.exports = router;