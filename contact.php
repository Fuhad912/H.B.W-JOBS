<?php
// Handle CORS headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Check if it's a POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo 'Method Not Allowed';
    exit();
}

// Get form data
$name = isset($_POST['name']) ? trim($_POST['name']) : '';
$email = isset($_POST['email']) ? trim($_POST['email']) : '';
$subject = isset($_POST['subject']) ? trim($_POST['subject']) : '';
$message = isset($_POST['message']) ? trim($_POST['message']) : '';

// Validate inputs
if (empty($name) || empty($email) || empty($subject) || empty($message)) {
    echo 'Please fill in all fields';
    exit();
}

// Validate email format
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo 'Invalid email address';
    exit();
}

// Set recipient email address
$receiving_email = 'hbwjobs001@gmail.com';

// Sanitize inputs
$name = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
$email = filter_var($email, FILTER_SANITIZE_EMAIL);
$subject = htmlspecialchars($subject, ENT_QUOTES, 'UTF-8');
$message = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');

// Create email body
$email_body = "
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 5px; }
        .header { background: #667eea; color: white; padding: 20px; border-radius: 5px 5px 0 0; text-align: center; }
        .content { background: white; padding: 20px; border-radius: 0 0 5px 5px; }
        .field { margin-bottom: 15px; }
        .label { font-weight: bold; color: #667eea; }
        .value { margin-top: 5px; padding: 10px; background: #f5f5f5; border-radius: 3px; }
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h2>New Contact Form Submission</h2>
        </div>
        <div class='content'>
            <div class='field'>
                <div class='label'>From:</div>
                <div class='value'>" . $name . " (" . $email . ")</div>
            </div>
            <div class='field'>
                <div class='label'>Subject:</div>
                <div class='value'>" . $subject . "</div>
            </div>
            <div class='field'>
                <div class='label'>Message:</div>
                <div class='value'>" . nl2br($message) . "</div>
            </div>
        </div>
    </div>
</body>
</html>
";

// Send email via Gmail SMTP
$gmail_email = 'hbwjobs001@gmail.com';  // Your Gmail address
$gmail_app_password = 'cboxphqlzitgvmqp';  // Gmail app password

$smtp_host = 'smtp.gmail.com';
$smtp_port = 587;

try {
    // Connect to Gmail SMTP server
    $smtp = @fsockopen($smtp_host, $smtp_port, $errno, $errstr, 10);
    
    if (!$smtp) {
        throw new Exception("Cannot connect to SMTP server: $errstr ($errno)");
    }
    
    // Read server response
    $response = fgets($smtp, 1024);
    
    // Send HELO
    fputs($smtp, "HELO localhost\r\n");
    fgets($smtp, 1024);
    
    // Start TLS
    fputs($smtp, "STARTTLS\r\n");
    fgets($smtp, 1024);
    stream_socket_enable_crypto($smtp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
    
    // Authenticate
    fputs($smtp, "AUTH LOGIN\r\n");
    fgets($smtp, 1024);
    fputs($smtp, base64_encode($gmail_email) . "\r\n");
    fgets($smtp, 1024);
    fputs($smtp, base64_encode($gmail_app_password) . "\r\n");
    $auth_response = fgets($smtp, 1024);
    
    if (strpos($auth_response, '235') === false && strpos($auth_response, '250') === false) {
        throw new Exception("Authentication failed. Make sure your Gmail password is set correctly at the top of contact.php");
    }
    
    // Send email
    fputs($smtp, "MAIL FROM: <" . $gmail_email . ">\r\n");
    fgets($smtp, 1024);
    fputs($smtp, "RCPT TO: <" . $receiving_email . ">\r\n");
    fgets($smtp, 1024);
    fputs($smtp, "DATA\r\n");
    fgets($smtp, 1024);
    
    $headers = "From: " . $email . "\r\n";
    $headers .= "Reply-To: " . $email . "\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    
    fputs($smtp, "Subject: H-B-W Jobs Contact: " . $subject . "\r\n");
    fputs($smtp, $headers . "\r\n");
    fputs($smtp, $email_body . "\r\n.\r\n");
    fgets($smtp, 1024);
    
    // Close connection
    fputs($smtp, "QUIT\r\n");
    fclose($smtp);
    
    echo 'OK';
} catch (Exception $e) {
    echo 'Error: ' . $e->getMessage();
}
exit();
?>
