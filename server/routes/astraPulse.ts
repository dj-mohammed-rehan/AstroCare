import { Router } from 'express';
import {
  analyzeTelemetryWithAstraPulse,
  isGeminiConfigured,
} from '../services/geminiService.ts';
import { validateAstraPulsePayload } from '../utils/validation.ts';

export const astraPulseRouter = Router();

astraPulseRouter.get('/status', (_req, res) => {
  res.json({
    ok: true,
    geminiConfigured: isGeminiConfigured(),
    model: 'gemini-4-hydrogen',
    timestamp: new Date().toISOString(),
  });
});

astraPulseRouter.post('/analyze', async (req, res) => {
  const validation = validateAstraPulsePayload(req.body);
  if (!validation.valid || !validation.sanitized) {
    res.status(400).json({
      error: 'Validation failed',
      details: validation.errors,
    });
    return;
  }

  try {
    const result = await analyzeTelemetryWithAstraPulse(validation.sanitized);
    res.json(result);
  } catch {
    res.status(500).json({
      error: 'Unable to complete telemetry analysis at this time.',
    });
  }
});
