import type { A2AJsonRpcResponse } from '@/libs/mcp/a2a/types';

export const jsonRpcResult = (id: string | number | null, result: any): A2AJsonRpcResponse => ({
  id: id ?? 0,
  jsonrpc: '2.0',
  result,
});

export const jsonRpcError = (
  id: string | number | null,
  code: number,
  message: string,
): A2AJsonRpcResponse => ({
  error: { code, message },
  id: id ?? 0,
  jsonrpc: '2.0',
});
