"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("@src/server");
const HttpStatusCodes_1 = __importDefault(require("@src/common/constants/HttpStatusCodes"));
const getCertainNumbers = async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search;
    let filtered = server_1.arr.map((item, position) => ({
        value: item.value,
        checked: item.checked,
        position
    }));
    if (search) {
        filtered = filtered.filter(obj => obj.value.toString().includes(search));
    }
    const start = (page - 1) * limit;
    const end = start + limit;
    const data = filtered.slice(start, end);
    res.status(HttpStatusCodes_1.default.OK).json({
        data,
        page,
        limit,
        total: filtered.length
    });
};
const replaceNumbers = async (req, res) => {
    const { item, newPosition } = req.body;
    if (typeof item !== 'number' || typeof newPosition !== 'number' || !Number.isInteger(newPosition) || newPosition < 0) {
        res.status(HttpStatusCodes_1.default.BAD_REQUEST).json({
            error: 'Request must contain item (number) and newPosition (non-negative integer)'
        });
        return;
    }
    const currentPosition = server_1.arr.findIndex(obj => obj.value === item);
    if (currentPosition === -1) {
        res.status(HttpStatusCodes_1.default.NOT_FOUND).json({
            error: 'Item not found in array'
        });
        return;
    }
    if (currentPosition === newPosition) {
        res.status(HttpStatusCodes_1.default.OK).json({ success: true });
        return;
    }
    const movingItem = server_1.arr[currentPosition];
    if (currentPosition < newPosition) {
        for (let i = currentPosition; i < newPosition; i++) {
            server_1.arr[i] = server_1.arr[i + 1];
        }
    }
    else {
        for (let i = currentPosition; i > newPosition; i--) {
            server_1.arr[i] = server_1.arr[i - 1];
        }
    }
    server_1.arr[newPosition] = movingItem;
    res.status(HttpStatusCodes_1.default.OK).json({ success: true });
};
const toggleChecked = async (req, res) => {
    const value = Number(req.params.item);
    const idx = server_1.arr.findIndex(obj => obj.value === value);
    if (idx === -1) {
        res.status(HttpStatusCodes_1.default.NOT_FOUND).json({ error: 'Item not found' });
        return;
    }
    server_1.arr[idx].checked = !server_1.arr[idx].checked;
    res.status(HttpStatusCodes_1.default.OK).json({ success: true, value, checked: server_1.arr[idx].checked });
};
exports.default = {
    getCertainNumbers,
    replaceNumbers,
    toggleChecked,
};
