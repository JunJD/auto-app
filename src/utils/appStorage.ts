function createAppStorage() {
    if(typeof window !== 'undefined') {
        return {
            setItem,
            getItem
        }
    } else {
        return {
            setItem: () => {},
            getItem: () => {}
        }
    }
    function getItem (key: string) {
        // 实现获取本地存储数据的逻辑
        return localStorage.getItem(key);
    }
    function setItem (key: string, value: string) {
        // 实现设置本地存储数据的逻辑
        return localStorage.setItem(key, value);
    }
}
const appStorage = createAppStorage()
export default appStorage
