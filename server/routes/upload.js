const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const baseUploadsDir = path.join(__dirname, '../public/uploads');
const baseAssessmentFilesDir = path.join(baseUploadsDir, 'assessment_files');
const tempUploadDir = path.join(baseUploadsDir, 'temp');

const tempStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitizedOriginalName}`);
  }
});

const upload = multer({ storage: tempStorage, limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/imaging-file', upload.single('imagingFile'), (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const formSessionId = req.query.formSessionId || 'default_session';
  const sanitizedSessionId = formSessionId.replace(/[^a-zA-Z0-9_-]/g, '');
  
  const finalSessionDir = path.join(baseAssessmentFilesDir, sanitizedSessionId);
  if (!fs.existsSync(finalSessionDir)) {
    fs.mkdirSync(finalSessionDir, { recursive: true });
  }

  const tempPath = req.file.path;
  const finalPath = path.join(finalSessionDir, req.file.filename);
  
  fs.rename(tempPath, finalPath, (err) => {
    if (err) {
      console.error('Error moving file:', err);
      try {
        fs.unlinkSync(tempPath);
      } catch (unlinkErr) {
        console.error('Error cleaning up temp file:', unlinkErr);
      }
      return res.status(500).json({ error: 'Failed to process file upload.' });
    }

    let relativeFilePath = path.join(sanitizedSessionId, req.file.filename);
    if (path.sep === '\\') {
      relativeFilePath = relativeFilePath.replace(/\\/g, '/');
    }

    res.status(200).json({
      message: 'File uploaded successfully',
      filePath: relativeFilePath
    });
  });
});

router.post('/pain-map', async (req, res) => {
  const { imageData, view, formSessionId } = req.body;

  if (!imageData || !view || !formSessionId) {
    return res.status(400).json({ error: 'Missing required data for pain map upload.' });
  }

  try {
    const base64Data = imageData.replace(/^data:image\/png;base64,/, "");
    const sanitizedSessionId = formSessionId.replace(/[^a-zA-Z0-9_-]/g, '');
    const finalSessionDir = path.join(baseAssessmentFilesDir, sanitizedSessionId);

    if (!fs.existsSync(finalSessionDir)) {
      fs.mkdirSync(finalSessionDir, { recursive: true });
    }

    const filename = `pain-map-${view}-${Date.now()}.png`;
    const finalPath = path.join(finalSessionDir, filename);
    
    fs.writeFileSync(finalPath, base64Data, 'base64');

    let relativeFilePath = path.join(sanitizedSessionId, filename);
    if (path.sep === '\\') {
      relativeFilePath = relativeFilePath.replace(/\\/g, '/');
    }

    res.status(200).json({
      message: 'Pain map uploaded successfully',
      filePath: relativeFilePath
    });
  } catch (error) {
    console.error('Error saving pain map image:', error);
    res.status(500).json({ error: 'Failed to save pain map image.' });
  }
});

module.exports = router;
