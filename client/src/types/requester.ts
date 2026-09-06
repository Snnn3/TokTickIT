export interface RequesterUser {
  id: number;
  name: string;
  email: string;
}

export interface RequesterContextType {
  selectedRequester: RequesterUser | null;
  selectRequester: (requester: RequesterUser) => void;
  clearRequester: () => void;
}
