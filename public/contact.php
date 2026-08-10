<?php
/**
 * Contact form handler for Palak Steel Mill Ltd.
 *
 * Replaces the previous Web3Forms integration: the site is hosted on PHP under
 * DirectAdmin, and info@psml.ke is a mailbox on the same server, so mail() is a
 * local delivery - no third-party cap, no publicly exposed API key, no SPF/DKIM
 * risk from sending through an external relay.
 *
 * Responds with JSON to fetch() requests, and with a plain redirect for browsers
 * with JavaScript disabled, so the form degrades gracefully either way.
 */

declare(strict_types=1);

const RECIPIENT    = 'info@psml.ke';
// Sender identity. This is also passed as the envelope sender (-f), and shared
// hosts generally only accept an envelope sender that is a REAL mailbox on the
// account - otherwise mail() fails outright or the message is scored as spam.
// info@psml.ke is known to exist, so it is the safe default. If you would rather
// enquiries came from a dedicated address, create website@psml.ke as a mailbox
// or forwarder in DirectAdmin FIRST, then change this line.
// Replies are unaffected either way: Reply-To is set to the enquirer below.
const MAIL_FROM    = 'info@psml.ke';
const SUBJECT      = 'New enquiry from psml.ke';
const MIN_SECONDS  = 3;     // faster than this and it is almost certainly a bot
const MAX_MESSAGE  = 5000;

/** True when the request came from fetch() rather than a native form post. */
function wantsJson(): bool
{
    $accept = $_SERVER['HTTP_ACCEPT'] ?? '';
    $xhr    = $_SERVER['HTTP_X_REQUESTED_WITH'] ?? '';
    // strpos rather than str_contains: that helper is PHP 8.0+, and shared
    // DirectAdmin accounts are commonly still on 7.4.
    return strpos($accept, 'application/json') !== false || $xhr === 'fetch';
}

/** Sends the response and exits. Untyped return for PHP 7.4 compatibility. */
function respond(bool $ok, string $message, int $status = 200)
{
    if (wantsJson()) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => $ok, 'message' => $message]);
    } else {
        // No-JS fallback: bounce back to the form with a flag in the query
        // string. 303 in both cases so a refresh cannot resubmit the POST.
        http_response_code(303);
        header('Location: /contact.html?sent=' . ($ok ? '1' : '0'));
    }
    exit;
}

/** Strip CR/LF so a submitted value cannot inject extra mail headers. */
function clean(string $value, int $maxLen = 200): string
{
    $value = str_replace(["\r", "\n", "%0a", "%0d"], ' ', $value);
    $value = trim($value);
    if (function_exists('mb_substr')) {
        return mb_substr($value, 0, $maxLen);
    }
    return substr($value, 0, $maxLen);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(false, 'Method not allowed.', 405);
}

// --- spam traps ---------------------------------------------------------
// Hidden field a human never sees and therefore never fills in.
if (!empty($_POST['website'] ?? '')) {
    // Report success so the bot does not retry with a different payload.
    respond(true, 'Thank you! Your message has been sent.');
}

$startedAt = (int) ($_POST['started_at'] ?? 0);
if ($startedAt > 0 && (time() - intdiv($startedAt, 1000)) < MIN_SECONDS) {
    respond(true, 'Thank you! Your message has been sent.');
}

// --- validation ---------------------------------------------------------
$name    = clean($_POST['name']    ?? '');
$email   = clean($_POST['email']   ?? '');
$phone   = clean($_POST['phone']   ?? '', 40);
$company = clean($_POST['company'] ?? '');
$product = clean($_POST['product'] ?? '', 60);
$message = trim((string) ($_POST['message'] ?? ''));

if (function_exists('mb_substr')) {
    $message = mb_substr($message, 0, MAX_MESSAGE);
} else {
    $message = substr($message, 0, MAX_MESSAGE);
}

$errors = [];
if ($name === '')    { $errors[] = 'name'; }
if ($message === '') { $errors[] = 'message'; }
if ($phone === '')   { $errors[] = 'phone'; }
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) { $errors[] = 'email'; }

if ($errors) {
    respond(false, 'Please check the highlighted fields and try again.', 422);
}

// --- compose ------------------------------------------------------------
$lines = [
    'Name:     ' . $name,
    'Email:    ' . $email,
    'Phone:    ' . $phone,
    'Company:  ' . ($company !== '' ? $company : '-'),
    'Product:  ' . ($product !== '' ? $product : '-'),
    '',
    'Message:',
    $message,
    '',
    '---',
    'Sent from the psml.ke contact form',
    'IP:   ' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'),
    'Time: ' . date('Y-m-d H:i:s'),
];
$body = implode("\n", $lines);

$headers = [
    'From: Palak Steel Mill Website <' . MAIL_FROM . '>',
    'Reply-To: ' . $name . ' <' . $email . '>',   // replying goes to the enquirer
    'Content-Type: text/plain; charset=UTF-8',
    'X-Mailer: PHP/' . phpversion(),
];

$sent = @mail(
    RECIPIENT,
    SUBJECT . ($company !== '' ? ' - ' . $company : ''),
    $body,
    implode("\r\n", $headers),
    '-f' . MAIL_FROM
);

if (!$sent) {
    error_log('psml.ke contact form: mail() failed for ' . $email);
    respond(false, 'Sorry, we could not send your message. Please call +254 716 923 777 or email info@psml.ke.', 500);
}

respond(true, 'Thank you! Your message has been sent. We will get back to you within 24 hours.');
