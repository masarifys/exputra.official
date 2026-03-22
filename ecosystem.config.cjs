module.exports = {
    apps: [{
        name: 'exputra-production',
        script: 'node_modules/next/dist/bin/next',
        args: 'start -H 0.0.0.0 -p 3000',
        cwd: '/www/wwwroot/exputra.id',
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '1G',
        env: {
            NODE_ENV: 'production',
            PORT: 3000
        }
    }]
}
