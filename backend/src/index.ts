import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { createServer } from 'http';
import express from 'express';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { makeExecutableSchema } from '@graphql-tools/schema';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDb } from './db';
import { connectRedis } from './redis';
import { typeDefs, resolvers } from './schema';

dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;

async function bootstrap() {
  // Initialize services in parallel
  await Promise.all([
    connectDb(),
    connectRedis()
  ]);

  const app = express();
  const httpServer = createServer(app);

  const schema = makeExecutableSchema({ typeDefs, resolvers });

  // Create WebSocket Server for Apollo Subscription Support
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  // Hand off subscription handling to graphql-ws
  const serverCleanup = useServer({ schema }, wsServer);

  // Setup Apollo Server
  const server = new ApolloServer({
    schema,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
  });

  await server.start();

  // Apply cors & express middleware
  app.use(
    '/graphql',
    cors<cors.CorsRequest>(),
    express.json(),
    expressMiddleware(server)
  );

  httpServer.listen(PORT, () => {
    console.log(`🚀 SENTRA Backend operations ready at: http://localhost:${PORT}/graphql`);
    console.log(`📡 GraphQL WebSockets listening on: ws://localhost:${PORT}/graphql`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to bootstrap SENTRA service:', err);
});
