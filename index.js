var express = require('express');
var app = express();
var session = require('express-session');
const { db, auth } = require('./firebase');

app.set('views', './views');
app.set('view engine', 'ejs');

// 1. Cấu hình xử lý dữ liệu Form và Static File (Phải nằm trên cùng)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// 2. Cấu hình Session
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } 
}));

// 3. Middleware cung cấp dữ liệu cho toàn bộ các file EJS
app.use(async (req, res, next) => {
    try {
        // Chỉ lấy dữ liệu khi không phải là yêu cầu lấy file tĩnh (css, js, img)
        if (req.path.includes('.') || req.path.startsWith('/public')) return next();

        const snapshot = await db.collection('chude').get();
        res.locals.dsChuDe = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.locals.session = req.session;
        res.locals.message = '';
        next();
    } catch (error) {
        res.locals.dsChuDe = [];
        res.locals.session = req.session;
        res.locals.message = '';
        next();
    }
});
// 4. Khai báo Router
var indexRouter = require('./routers/index');
var authRouter = require('./routers/auth');
var chudeRouter = require('./routers/chude');
var taikhoanRouter = require('./routers/taikhoan');
var baivietRouter = require('./routers/baiviet');
var timkiemRouter = require('./routers/timkiem');
// 5. Điều hướng (Thứ tự rất quan trọng)
app.use('/chude', chudeRouter);     // Trang quản lý chủ đề
app.use('/taikhoan', taikhoanRouter); // Trang quản lý tài khoản
app.use('/baiviet', baivietRouter);   // Trang quản lý bài viết
app.use('/timkiem',timkiemRouter);
app.use('/', authRouter);         
app.use('/', indexRouter);           

app.listen(3000, () => {

    if (db) console.log("Đã kết nối đến Firebase!");

    console.log('Server đang chạy tại http://127.0.0.1:3000');

});