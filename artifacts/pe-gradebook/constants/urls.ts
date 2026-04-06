// Base URL for the API server — update this if the domain changes after redeployment
const API_BASE = process.env.EXPO_PUBLIC_API_BASE
  ?? "https://e601fa95-0272-4c79-adf0-a7af9ad24fc3-00-39zorjrv69por.worf.replit.dev";

export const QUICK_REFERENCE_PDF_URL = `${API_BASE}/api/pdf/quick-reference.pdf`;
