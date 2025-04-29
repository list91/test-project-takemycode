"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    Base: '/api',
    Numbers: {
        Get: '/numbers',
        Replace: '/numbers/replace',
        Toggle: '/numbers/:item/toggle',
    },
    // Добавлено для поддержки тестов и роутинга пользователей
    Users: {
        Get: '/users',
        Add: '/users/add',
        Update: '/users/update/:id',
        Delete: '/users/delete/:id',
    },
};
