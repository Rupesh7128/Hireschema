import { createAiGatewayHandler } from './_aiGateway';

export default createAiGatewayHandler({ engine: 'cover_letter', modelEnvKey: 'OPENAI_MODEL_COVER_LETTER' });

