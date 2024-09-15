// import { HttpVerb, fetch } from "@tauri-apps/api/http";
import { fetch as tauriFetch, ResponseType, Response} from "@tauri-apps/api/http";

const noTauriApiList = [
    'https://autonginx1.dingjunjie.com/api/devices'
] 

const REQUEST_TIMEOUT_MS = 10000;
export async function appFetch(
    url: string,
    options?: Record<string, unknown>,
): Promise<any> {
    if (window.__TAURI__ && noTauriApiList.every(item => !url.startsWith(item))) {
        const payload = options?.body || options?.data;
        console.log('window.__TAURI__', url, payload)
        try {
            const res = await tauriFetch(url, {
                ...options,
                body:
                    payload &&
                    ({
                        type: "Text",
                        payload,
                    } as any),
                timeout: ((options?.timeout as number) || REQUEST_TIMEOUT_MS) / 1000,
                responseType:
                    options?.responseType == "text" ? ResponseType.Text : ResponseType.JSON,
            } as any);
            console.log('go tauri res is', res)
            return res
        } catch (error) {
            console.log('go tauri error is', error)
        }
    }
    console.log('走 window.fetch')
    return window.fetch(url, options);
}

export class FetchQueue {
    private maxConcurrent: number;
    private queue: Array<{ fetchPromise: (controller: AbortController) => Promise<Response<any>>, resolve: (value: Response<any> | PromiseLike<Response<any>>) => void, reject: (reason?: any) => void, controller: AbortController, priority: number }>;
    private activeRequests: number;
    private activeControllers: Set<AbortController>;

    constructor(maxConcurrent: number = 5) {
        this.maxConcurrent = maxConcurrent;
        this.queue = [];
        this.activeRequests = 0;
        this.activeControllers = new Set();
    }

    enqueue(fetchPromise: (controller: AbortController) => Promise<Response<any>>, priority: number = 0): Promise<Response<any>> {
        const controller = new AbortController();

        return new Promise((resolve, reject) => {
            if (priority === 1) {
                this.queue.push({ fetchPromise, resolve, reject, controller, priority });
            } else if (priority === 2) {
                this.queue.unshift({ fetchPromise, resolve, reject, controller, priority });
            }
            this.processQueue();
        });
    }

    private processQueue(): void {
        if (this.activeRequests > this.maxConcurrent || this.queue.length === 0) {
            return;
        }
        const { fetchPromise, resolve, reject, controller } = this.queue.shift()!;

        this.activeRequests++;
        this.activeControllers.add(controller);

        fetchPromise(controller)
            .then(response => {
                resolve(response);
                this.activeRequests--;
                this.activeControllers.delete(controller);
                this.processQueue();
            })
            .catch(error => {
                reject(error);
                this.activeRequests--;
                this.activeControllers.delete(controller);
                this.processQueue();
            });
    }

    // 添加 pause 方法
    pause(): void {
        this.queue.forEach(({ controller }) => controller.abort());
        this.queue = [];
        this.activeControllers.forEach(controller => controller.abort());
        this.activeControllers.clear();
    }

    // // 添加 resume 方法
    // resume(): void {
    //     this.paused = false;
    //     this.processQueue();
    // }
}

const fetchQueue = new FetchQueue(8);

export function customFetch(input: RequestInfo, init?: RequestInit & { responseType?: 'text' | 'json' }, priority: number = 1): Promise<Response<any>> {
    return fetchQueue.enqueue((controller) => {
        const config = { ...init, signal: controller.signal };
        return appFetch(input as string, config);
    }, priority);
}

export function pauseFetchQueue(): void {
    fetchQueue.pause();
}
const fetchQueue2 = new FetchQueue(3);

export function customFetch2(input: RequestInfo, init?: RequestInit, priority: number = 1): Promise<Response<any>> {
    return fetchQueue2.enqueue((controller) => {
        const config = {
            "Content-Type": "application/json",
            ...init,
            signal: controller.signal
        };
        return appFetch(input as string, config);
    }, priority);
}

export function pauseFetchQueue2(): void {
    fetchQueue2.pause();
}

export const fetchBashUrlList = [
    "http://127.0.0.1:3001"
    // "https://autonginx1.dingjunjie.com",
    // "https://autonginx2.dingjunjie.com",
    // "https://autonginx3.dingjunjie.com",
    // "https://autonginx4.dingjunjie.com",
    // "https://autonginx5.dingjunjie.com",
    // "https://autonginx6.dingjunjie.com",
    // "https://autonginx7.dingjunjie.com",
]
