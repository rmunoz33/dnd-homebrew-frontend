export const ResourceList = (data: any[]) => {
  return { count: data.length, results: data }
}

export const escapeRegExp = (string: string) => {
  return string.toString().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
