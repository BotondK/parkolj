import { buildApp } from './app';

const port = Number(process.env.PORT ?? 3000);
buildApp({ logger: true })
  .listen({ port, host: '0.0.0.0' })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
