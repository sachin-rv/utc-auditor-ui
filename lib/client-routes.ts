export function clientHomePath(clientId: string) {
  return `/dashboard/client/${clientId}`;
}

export function clientProjectPath(clientId: string, projectId: string) {
  return `/dashboard/client/${clientId}/project/${projectId}`;
}

export function clientReportPath(clientId: string, reportId: string) {
  return `/dashboard/client/${clientId}/report/${reportId}`;
}

export function clientReportDetailsPath(clientId: string, reportId: string) {
  return `/dashboard/client/${clientId}/report/${reportId}/details`;
}
