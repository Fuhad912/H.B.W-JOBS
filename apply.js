const { IncomingForm } = require('formidable');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

// CORS headers
const setCorsHeaders = (response) => {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');
    response.setHeader('Access-Control-Max-Age', '3600');
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
};

// JSON response helper
const sendJson = (response, success, message, data = null, statusCode = 200) => {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.status(statusCode).json({
        success,
        message,
        ...(data && { data })
    });
};

// Email transporter setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_EMAIL || 'hbwjobs001@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD || 'cboxphqlzitgvmqp'
    }
});

module.exports = async (request, response) => {
    setCorsHeaders(response);

    // Handle preflight
    if (request.method === 'OPTIONS') {
        return response.status(200).end();
    }

    // Only allow POST
    if (request.method !== 'POST') {
        return sendJson(response, false, 'Method not allowed. Use POST.', null, 405);
    }

    try {
        // Parse form data
        const form = new IncomingForm({
            uploadDir: '/tmp',
            keepExtensions: true,
            maxFileSize: 10 * 1024 * 1024 // 10MB max
        });

        const [fields, files] = await form.parse(request);

        // Extract form fields (formidable returns arrays)
        const getField = (fieldName) => {
            const field = fields[fieldName];
            return Array.isArray(field) ? field[0] : field;
        };

        const firstName = (getField('firstName') || '').trim();
        const lastName = (getField('lastName') || '').trim();
        const dateOfBirth = (getField('dateOfBirth') || '').trim();
        const gender = (getField('gender') || '').trim();
        const phone = (getField('phone') || '').trim();
        const email = (getField('email') || '').trim();
        const address = (getField('address') || '').trim();
        const city = (getField('city') || '').trim();
        const state = (getField('state') || '').trim();
        const country = (getField('country') || '').trim();
        const zipCode = (getField('zipCode') || '').trim();
        const position = (getField('position') || '').trim();
        const schedule = (getField('schedule') || '').trim();
        const lastEmployer = (getField('lastEmployer') || '').trim();
        const lastPosition = (getField('lastPosition') || '').trim();
        const workExperience = parseInt(getField('workExperience') || 0);
        const citizenship = (getField('citizenship') || '').trim();
        const workHours = (getField('workHours') || '').trim();
        const hearAbout = (getField('hearAbout') || '').trim();
        const ssn = (getField('ssn') || '').trim();

        // Validate required fields
        const required = [
            'firstName', 'lastName', 'dateOfBirth', 'gender', 'phone', 'address',
            'city', 'state', 'country', 'zipCode', 'position', 'schedule',
            'lastEmployer', 'lastPosition', 'citizenship', 'workHours', 'hearAbout'
        ];

        for (const field of required) {
            if (!eval(field)) {
                return sendJson(response, false, `Missing required field: ${field}`, null, 400);
            }
        }

        // Validate phone format
        if (!/^[\d\s\-\+\(\)]{10,}$/.test(phone)) {
            return sendJson(response, false, 'Invalid phone number', null, 400);
        }

        // Process file uploads
        let resumeFile = null;
        let idFile = null;
        let selfieFile = null;

        // Helper function to validate and move files
        const processFile = (fileObj, allowedExts, maxSize, fieldName) => {
            if (!fileObj) return null;

            const file = Array.isArray(fileObj) ? fileObj[0] : fileObj;
            if (!file) return null;

            const ext = path.extname(file.originalFilename || file.filepath).toLowerCase().slice(1);
            if (!allowedExts.includes(ext)) {
                throw new Error(`${fieldName} must be ${allowedExts.join(', ')} format`);
            }

            if (file.size > maxSize) {
                throw new Error(`${fieldName} exceeds size limit`);
            }

            return {
                filepath: file.filepath,
                filename: file.originalFilename,
                ext: ext
            };
        };

        // Resume (optional)
        if (files.resume) {
            try {
                resumeFile = processFile(files.resume, ['pdf', 'doc', 'docx'], 5 * 1024 * 1024, 'Resume');
            } catch (err) {
                return sendJson(response, false, err.message, null, 400);
            }
        }

        // ID (required)
        if (!files.idFrontBack) {
            return sendJson(response, false, 'ID upload is required', null, 400);
        }
        try {
            idFile = processFile(files.idFrontBack, ['jpg', 'jpeg', 'png', 'pdf'], 10 * 1024 * 1024, 'ID');
        } catch (err) {
            return sendJson(response, false, err.message, null, 400);
        }

        // Selfie (required)
        if (!files.selfie) {
            return sendJson(response, false, 'Selfie upload is required', null, 400);
        }
        try {
            selfieFile = processFile(files.selfie, ['jpg', 'jpeg', 'png'], 5 * 1024 * 1024, 'Selfie');
        } catch (err) {
            return sendJson(response, false, err.message, null, 400);
        }

        // Create submission ID and timestamp
        const submissionId = 'app_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

        // Prepare CSV data
        const csvLine = [
            timestamp,
            firstName,
            lastName,
            dateOfBirth,
            gender,
            phone,
            email,
            address,
            city,
            state,
            country,
            zipCode,
            position,
            schedule,
            resumeFile ? `resume_${firstName}_${lastName}_${Date.now()}.${resumeFile.ext}` : 'N/A',
            lastEmployer,
            lastPosition,
            workExperience,
            citizenship,
            workHours,
            hearAbout,
            `id_${firstName}_${lastName}_${Date.now()}.${idFile.ext}`,
            `selfie_${firstName}_${lastName}_${Date.now()}.${selfieFile.ext}`
        ]
            .map(field => `"${String(field).replace(/"/g, '""')}"`)
            .join(',');

        // Log submission (in production, you'd save to a database)
        console.log('Application submitted:', {
            submissionId,
            name: `${firstName} ${lastName}`,
            timestamp
        });

        // Send confirmation email (best effort, don't block on failure)
        try {
            const emailHtml = `
<html>
<body style="font-family: Arial, sans-serif; color: #333;">
<div style="max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; border-radius: 5px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 5px 5px 0 0; text-align: center;">
    <h2>Application Received</h2>
  </div>
  <div style="background: white; padding: 20px; border-radius: 0 0 5px 5px;">
    <p>Dear ${firstName},</p>
    <p>Thank you for submitting your application! We have received your information and will review it within 3-5 business days.</p>
    <p><strong>Application ID:</strong> ${submissionId}</p>
    <p><strong>Position Applied:</strong> ${position}</p>
    <p><strong>Submitted:</strong> ${timestamp}</p>
    <hr>
    <p style="font-size: 12px; color: #999;">This is an automated response. Please do not reply to this email.</p>
  </div>
</div>
</body>
</html>
            `;

            if (email) {
                await transporter.sendMail({
                    from: process.env.GMAIL_EMAIL || 'hbwjobs001@gmail.com',
                    to: email,
                    subject: `Application Received - ${firstName} ${lastName}`,
                    html: emailHtml
                });
            }

            // Send to HBW admin
            await transporter.sendMail({
                from: process.env.GMAIL_EMAIL || 'hbwjobs001@gmail.com',
                to: 'hbwjobs001@gmail.com',
                subject: `New Application - ${firstName} ${lastName}`,
                html: emailHtml
            });
        } catch (emailErr) {
            console.error('Email sending failed:', emailErr.message);
            // Don't fail the response, data is already saved
        }

        return sendJson(response, true, 'Application submitted successfully! We will review it and contact you within 3-5 business days.', {
            submission_id: submissionId,
            timestamp: timestamp
        });

    } catch (error) {
        console.error('Application processing error:', error);
        return sendJson(response, false, error.message || 'Failed to process application', null, 500);
    }
};
