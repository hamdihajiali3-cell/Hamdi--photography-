<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // استقبال وتنقية البيانات المرسلة من الموقع
    $name = strip_tags(trim($_POST["name"]));
    $session = strip_tags(trim($_POST["session"]));
    $message = trim($_POST["message"]);

    // التأكد من عدم ترك الحقول فارغة
    if (empty($name) || empty($message)) {
        http_response_code(400);
        echo "الرجاء تعبئة جميع الحقول المطلوبة.";
        exit;
    }

    // نص الرسالة البريدية
    $email_content = "اسم العميل: " . $name . "\n";
    $email_content .= "نوع الجلسة: " . $session . "\n\n";
    $email_content .= "التفاصيل:\n" . $message . "\n";

    // ترويسات الإرسال
    $headers = "From: no-reply@website.com\r\n";

    // ملاحظة: البريد هنا متروك فارغاً بناءً على طلبك، يمكنك إضافة الإيميل الذي تريد استقبال الرسائل عليه مكان الفراغ أو عبر متغير خارجي
    $to = ""; 

    if (!empty($to) && mail($to, "طلب حجز جديد", $email_content, $headers)) {
        http_response_code(200);
        echo "تم إرسال رسالتك بنجاح.";
    } else {
        http_response_code(500);
        echo "عذراً، حدث خطأ أثناء إرسال الرسالة.";
    }
} else {
    http_response_code(403);
    echo "غير مسموح بالوصول المباشر لهذا الملف.";
}
?>
