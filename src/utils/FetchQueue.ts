export class FetchQueue {
    private maxConcurrent: number;
    private queue: Array<{ fetchPromise: (controller: AbortController) => Promise<Response>, resolve: (value: Response | PromiseLike<Response>) => void, reject: (reason?: any) => void, controller: AbortController }>;
    private activeRequests: number;
    private paused: boolean;
    private activeControllers: Set<AbortController>;

    constructor(maxConcurrent: number = 5) {
        this.maxConcurrent = maxConcurrent;
        this.queue = [];
        this.activeRequests = 0;
        this.paused = false;
        this.activeControllers = new Set();
    }

    enqueue(fetchPromise: (controller: AbortController) => Promise<Response>): Promise<Response> {
        const controller = new AbortController();

        return new Promise((resolve, reject) => {
            this.queue.push({ fetchPromise, resolve, reject, controller });
            this.processQueue();
        });
    }

    private processQueue(): void {
        if (this.paused || this.activeRequests >= this.maxConcurrent || this.queue.length === 0) {
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
        this.paused = true;
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

const fetchQueue = new FetchQueue(5);

export function customFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
    return fetchQueue.enqueue((controller) => {
        const config = { ...init, signal: controller.signal };
        return fetch(input, config);
    });
}

export function pauseFetchQueue(): void {
    fetchQueue.pause();
}

// // Usage example
// customFetch('https://api.example.com/data')
//     .then(response => response.json())
//     .then(data => console.log(data))
//     .catch(error => console.error('Error:', error));

// 暂停队列并取消所有请求
// pauseFetchQueue();
