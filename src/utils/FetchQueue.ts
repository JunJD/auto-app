class FetchQueue {
    private maxConcurrent: number;
    private queue: Array<{ fetchPromise: () => Promise<Response>, resolve: (value: Response | PromiseLike<Response>) => void, reject: (reason?: any) => void }>;
    private activeRequests: number;

    constructor(maxConcurrent: number = 5) {
        this.maxConcurrent = maxConcurrent;
        this.queue = [];
        this.activeRequests = 0;
    }

    enqueue(fetchPromise: () => Promise<Response>): Promise<Response> {
        return new Promise((resolve, reject) => {
            this.queue.push({ fetchPromise, resolve, reject });
            this.processQueue();
        });
    }

    private processQueue(): void {
        if (this.activeRequests >= this.maxConcurrent || this.queue.length === 0) {
            return;
        }

        const { fetchPromise, resolve, reject } = this.queue.shift()!;
        this.activeRequests++;

        fetchPromise()
            .then(response => {
                resolve(response);
                this.activeRequests--;
                this.processQueue();
            })
            .catch(error => {
                reject(error);
                this.activeRequests--;
                this.processQueue();
            });
    }
}

const fetchQueue = new FetchQueue(5);

export function customFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
    return fetchQueue.enqueue(() => fetch(input, init));
}

// // Usage example
// customFetch('https://api.example.com/data')
//     .then(response => response.json())
//     .then(data => console.log(data))
//     .catch(error => console.error('Error:', error));
