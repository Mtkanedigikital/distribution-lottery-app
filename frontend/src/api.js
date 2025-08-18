const API_URL = "http://localhost:5000/api";

export async function enterLottery(name, productId) {
  const res = await fetch(`${API_URL}/entry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, productId }),
  });
  return res.json();
}

export async function getResult(entryId) {
  const res = await fetch(`${API_URL}/result/${entryId}`);
  return res.json();
}

export async function drawLottery(productId) {
  const res = await fetch(`${API_URL}/draw/${productId}`, { method: "POST" });
  return res.json();
}