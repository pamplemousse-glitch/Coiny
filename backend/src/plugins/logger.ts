export const loggerOptions = {
  serializers: {
    req(req: { method: string; url: string }) {
      return {
        method: req.method,
        url: req.url,
        // Never log Authorization headers — they may carry Teller access tokens.
      };
    },
    res(res: { statusCode: number }) {
      return { statusCode: res.statusCode };
    },
  },
};
