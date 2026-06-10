"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("@apollo/server");
const express4_1 = require("@apollo/server/express4");
const drainHttpServer_1 = require("@apollo/server/plugin/drainHttpServer");
const http_1 = require("http");
const express_1 = __importDefault(require("express"));
const ws_1 = require("ws");
const ws_2 = require("graphql-ws/lib/use/ws");
const schema_1 = require("@graphql-tools/schema");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./db");
const redis_1 = require("./redis");
const schema_2 = require("./schema");
dotenv_1.default.config();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;
async function bootstrap() {
    // Initialize services in parallel
    await Promise.all([
        (0, db_1.connectDb)(),
        (0, redis_1.connectRedis)()
    ]);
    const app = (0, express_1.default)();
    const httpServer = (0, http_1.createServer)(app);
    const schema = (0, schema_1.makeExecutableSchema)({ typeDefs: schema_2.typeDefs, resolvers: schema_2.resolvers });
    // Create WebSocket Server for Apollo Subscription Support
    const wsServer = new ws_1.WebSocketServer({
        server: httpServer,
        path: '/graphql',
    });
    // Hand off subscription handling to graphql-ws
    const serverCleanup = (0, ws_2.useServer)({ schema }, wsServer);
    // Setup Apollo Server
    const server = new server_1.ApolloServer({
        schema,
        plugins: [
            (0, drainHttpServer_1.ApolloServerPluginDrainHttpServer)({ httpServer }),
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
    app.use('/graphql', (0, cors_1.default)(), express_1.default.json(), (0, express4_1.expressMiddleware)(server));
    httpServer.listen(PORT, () => {
        console.log(`🚀 SENTRA Backend operations ready at: http://localhost:${PORT}/graphql`);
        console.log(`📡 GraphQL WebSockets listening on: ws://localhost:${PORT}/graphql`);
    });
}
bootstrap().catch((err) => {
    console.error('Failed to bootstrap SENTRA service:', err);
});
