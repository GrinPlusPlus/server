import Koa from 'koa';
import tldjs from 'tldjs';
import http from 'http';
import Router from 'koa-router';
import ClientManager from './lib/ClientManager';
import { Address, createAddress } from './lib/Address';

function setupAPIs(clientManager) {
    const app = new Koa();
    const router = new Router();

    router.get('/api/status', async (ctx, next) => {
        const stats = clientManager.stats;
        ctx.body = {
            tunnels: stats.tunnels,
            mem: process.memoryUsage(),
        };
    });

    router.get('/api/tunnels/:id/status', async (ctx, next) => {
        const clientId = ctx.params.id;
        const client = clientManager.getClient(clientId);
        if (!client) {
            ctx.throw(404);
            return;
        }

        const stats = client.stats();
        ctx.body = {
            connected_sockets: stats.connectedSockets,
        };
    });

    app.use(router.routes());
    app.use(router.allowedMethods());

    return app;
}

function startServer(opt, clientManager, appCallback) {
    const validHosts = (opt.domain) ? [opt.domain] : undefined;
    const myTldjs = tldjs.fromUserSettings({ validHosts });

    const server = http.createServer();
    server.on('request', (req, res) => {
        // without a hostname, we won't know who the request is for
        const hostname = req.headers.host;
        if (!hostname) {
            res.statusCode = 400;
            res.end('Host header is required');
            return;
        }

        const clientId = myTldjs.getSubdomain(hostname);
        if (!clientId) {
            appCallback(req, res);
            return;
        }

        const address = createAddress(clientId);
        if (address == null) {
            appCallback(req, res);
            return;
        }

        const client = clientManager.getClient(address.get());
        if (!client) {
            res.statusCode = 404;
            res.end('404');
            return;
        }

        client.handleRequest(req, res);
    });

    return server;
}

export default function(opt) {
    opt = opt || {};

    const manager = new ClientManager(opt);

    const app = setupAPIs(manager);
    const appCallback = app.callback();

    return startServer(opt, manager, appCallback);
};
