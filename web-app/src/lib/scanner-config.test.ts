import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scanDimensions, scannerGenerationConfig} from './scanner-config';
test('scan images preserve aspect ratio, small objects and valid canvas dimensions', () => {
  assert.deepEqual(scanDimensions(4000,3000),{width:1600,height:1200});
  assert.deepEqual(scanDimensions(3000,4000),{width:1200,height:1600});
  assert.deepEqual(scanDimensions(640,480),{width:640,height:480});
  assert.deepEqual(scanDimensions(100000,1),{width:1600,height:1});
  for (const width of [0,-1,NaN,Infinity]) assert.throws(()=>scanDimensions(width,100));
});
test('bounded thinking preserves high-detail vision and legacy model compatibility', () => {
  const schema={type:'object'};
  const config=scannerGenerationConfig('gemini-3.8-flash',schema);
  assert.deepEqual(config.thinkingConfig,{thinkingLevel:'LOW'});
  assert.equal(config.mediaResolution,'MEDIA_RESOLUTION_HIGH');
  assert.equal(config.responseJsonSchema,schema);
  assert.equal(config.maxOutputTokens,8192);
  assert.equal('thinkingConfig' in scannerGenerationConfig('gemini-2.5-flash',schema),false);
  assert.equal('thinkingConfig' in scannerGenerationConfig('custom-model',schema),false);
});
