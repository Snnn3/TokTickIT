import type {
  RequesterDashboardResponse,
  StaffDashboardResponse,
} from "../types/dashboard";

export async function getRequesterDashboard(): Promise<{
  response: Response;
  data: RequesterDashboardResponse | null;
}> {
  const response = await fetch("/api/dashboard/requester");
  if (!response.ok) return { response, data: null };
  return {
    response,
    data: (await response.json()) as RequesterDashboardResponse,
  };
}

export async function getStaffDashboard(): Promise<{
  response: Response;
  data: StaffDashboardResponse | null;
}> {
  const response = await fetch("/api/dashboard/staff");
  if (!response.ok) return { response, data: null };
  return {
    response,
    data: (await response.json()) as StaffDashboardResponse,
  };
}
