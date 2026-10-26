/** Preserve small-object detail while bounding upload size. No upscaling. */
export function scanDimensions(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)
    throw new Error('Invalid image dimensions');
  const scale = Math.min(1, 1600 / Math.max(width, height));
  return {width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale))};
}
export function scannerGenerationConfig(model: string, schema: Record<string, unknown>) {
  return {
    responseMimeType: 'application/json', responseJsonSchema: schema,
    temperature: 0.1, maxOutputTokens: 8192,
    // Gemini 3 supports bounded reasoning: retain visual detail, reduce deliberation.
    ...(/^gemini-3(?:[.-]|$)/i.test(model) ? {
      thinkingConfig: {thinkingLevel: 'LOW'}, mediaResolution: 'MEDIA_RESOLUTION_HIGH',
    } : {}),
  };
}
