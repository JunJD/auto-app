export class FetchQueue {
    private maxConcurrent: number;
    private queue: Array<{ fetchPromise: (controller: AbortController) => Promise<Response>, resolve: (value: Response | PromiseLike<Response>) => void, reject: (reason?: any) => void, controller: AbortController, priority: number }>;
    private activeRequests: number;
    private activeControllers: Set<AbortController>;

    constructor(maxConcurrent: number = 5) {
        this.maxConcurrent = maxConcurrent;
        this.queue = [];
        this.activeRequests = 0;
        this.activeControllers = new Set();
    }

    enqueue(fetchPromise: (controller: AbortController) => Promise<Response>, priority: number = 0): Promise<Response> {
        const controller = new AbortController();

        return new Promise((resolve, reject) => {
            this.queue.push({ fetchPromise, resolve, reject, controller, priority });
            this.queue.sort((a, b) => b.priority - a.priority); // 根据优先级排序，优先级高的在前
            this.processQueue();
        });
    }

    private processQueue(): void {
        if (this.activeRequests >= this.maxConcurrent || this.queue.length === 0) {
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

export function customFetch(input: RequestInfo, init?: RequestInit, priority: number = 0): Promise<Response> {
    return fetchQueue.enqueue((controller) => {
        const config = { ...init, signal: controller.signal };
        return fetch(input, config);
    }, priority);
}

export function pauseFetchQueue(): void {
    fetchQueue.pause();
}