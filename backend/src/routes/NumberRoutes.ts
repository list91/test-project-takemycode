import { arr } from "@src/server";
import { Request, Response, RequestHandler } from "express";
import HttpStatusCodes from "@src/common/constants/HttpStatusCodes";

const getCertainNumbers: RequestHandler = async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const search = req.query.search as string | undefined;

  let filtered = arr.map((item, position) => ({
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
  res.status(HttpStatusCodes.OK).json({
    data,
    page,
    limit,
    total: filtered.length
  });
};

const replaceNumbers: RequestHandler = async (req, res) => {
  const { item, newPosition } = req.body;
  if (typeof item !== 'number' || typeof newPosition !== 'number' || !Number.isInteger(newPosition) || newPosition < 0) {
    res.status(HttpStatusCodes.BAD_REQUEST).json({ 
      error: 'Request must contain item (number) and newPosition (non-negative integer)' 
    });
    return;
  }
  
  const currentPosition = arr.findIndex(obj => obj.value === item);
  if (currentPosition === -1) {
    res.status(HttpStatusCodes.NOT_FOUND).json({ 
      error: 'Item not found in array' 
    });
    return;
  }

  if (currentPosition === newPosition) {
    res.status(HttpStatusCodes.OK).json({ success: true });
    return;
  }

  const movingItem = arr[currentPosition];
  if (currentPosition < newPosition) {
    for (let i = currentPosition; i < newPosition; i++) {
      arr[i] = arr[i + 1];
    }
  } else {
    for (let i = currentPosition; i > newPosition; i--) {
      arr[i] = arr[i - 1];
    }
  }
  arr[newPosition] = movingItem;
  res.status(HttpStatusCodes.OK).json({ success: true });
};

const toggleChecked: RequestHandler = async (req, res) => {
  const value = Number(req.params.item);
  const idx = arr.findIndex(obj => obj.value === value);
  if (idx === -1) {
    res.status(HttpStatusCodes.NOT_FOUND).json({ error: 'Item not found' });
    return;
  }
  arr[idx].checked = !arr[idx].checked;
  res.status(HttpStatusCodes.OK).json({ success: true, value, checked: arr[idx].checked });
};

export default {
  getCertainNumbers,
  replaceNumbers,
  toggleChecked,
} as const;
