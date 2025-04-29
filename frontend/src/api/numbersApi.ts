// Утилиты для работы с серверным API чисел

export interface NumberItem {
  value: number;
  checked: boolean;
  position: number;
}

export interface GetNumbersResponse {
  data: NumberItem[];
  page: number;
  limit: number;
  total: number;
}

// Получить список чисел с пагинацией и поиском
export async function fetchNumbers(page = 1, limit = 10, search = ""): Promise<GetNumbersResponse> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) params.append("search", search);
  const resp = await fetch(`/api/numbers?${params.toString()}`);
  if (!resp.ok) throw new Error("Ошибка загрузки чисел");
  return resp.json();
}

// Переместить элемент на новую позицию
export async function replaceNumber(item: number, newPosition: number): Promise<{ success: boolean }> {
  const resp = await fetch(`/api/numbers/replace`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item, newPosition })
  });
  if (!resp.ok) throw new Error("Ошибка перемещения числа");
  return resp.json();
}

// Переключить checked у элемента
export async function toggleChecked(item: number): Promise<{ success: boolean; value: number; checked: boolean }> {
  const resp = await fetch(`/api/numbers/${item}/toggle`, { method: "PATCH" });
  if (!resp.ok) throw new Error("Ошибка переключения чекбокса");
  return resp.json();
}
