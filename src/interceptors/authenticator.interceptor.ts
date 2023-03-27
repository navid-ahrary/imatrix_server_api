/* eslint-disable no-useless-catch */
import {
  inject,
  injectable,
  Interceptor,
  InvocationContext,
  InvocationResult,
  Provider,
  ValueOrPromise,
} from '@loopback/core';
import {HttpErrors, Request, RestBindings} from '@loopback/rest';

@injectable({tags: {key: AuthenticatorInterceptor.BINDING_KEY}})
export class AuthenticatorInterceptor implements Provider<Interceptor> {
  static readonly BINDING_KEY = `interceptors.${AuthenticatorInterceptor.name}`;
  private readonly API_KEY = process.env.API_KEY!;

  constructor(@inject(RestBindings.Http.REQUEST) private request: Request) {}

  /**
   * This method is used by LoopBack context to produce an interceptor function
   * for the binding.
   *
   * @returns An interceptor function
   */
  value() {
    return this.intercept.bind(this);
  }

  /**
   * The logic to intercept an invocation
   * @param invocationCtx - Invocation context
   * @param next - A function to invoke next interceptor or the target method
   */
  async intercept(invocationCtx: InvocationContext, next: () => ValueOrPromise<InvocationResult>) {
    try {
      const providedApiKey = this.request.headers.apiKey;

      if (providedApiKey !== this.API_KEY) {
        const errMsg = `Unauthorized : ${providedApiKey}`;

        console.error(errMsg);
        throw new HttpErrors.Unauthorized(errMsg);
      }

      const result = await next();
      // Add post-invocation logic here
      return result;
    } catch (err) {
      // Add error handling logic here
      throw err;
    }
  }
}
