let index = 0
export const fetchD = async () => {
    return new Promise<string>((resove) => {
        setTimeout(() => {
            resove('hello' + index++)
        }, 100)
    })
}

export const delay = (ms: number) => {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// 仅有字母递增
export const incrementAlphaString = (str: string): string => {
    let arr = str.split('').reverse();
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] === 'z') {
            arr[i] = 'a';
        } else {
            arr[i] = String.fromCharCode(arr[i].charCodeAt(0) + 1);
            return arr.reverse().join('');
        }
    }
    arr.push('a');
    return arr.reverse().join('');
};

export const incrementNumberString = (str: string): string => {
    let num = parseInt(str, 10);
    num += 1;
    
    // 将数字重新格式化为与原始字符串相同的长度
    let incrementedStr = num.toString();
    while (incrementedStr.length < str.length) {
        incrementedStr = '0' + incrementedStr;
    }
    return incrementedStr;
};

// 数字和字母混合递增
export const incrementAlphaNumericString = (str: string): string => {
    let arr = str.split('');
    let carry = 1;

    for (let i = arr.length - 1; i >= 0; i--) {
        if (/[a-zA-Z]/.test(arr[i])) {
            if (arr[i] === 'z') {
                arr[i] = 'a';
                carry = 1;
            } else if (arr[i] === 'Z') {
                arr[i] = 'A';
                carry = 1;
            } else {
                arr[i] = String.fromCharCode(arr[i].charCodeAt(0) + carry);
                carry = 0;
                break;
            }
        } else if (/\d/.test(arr[i])) {
            let num = parseInt(arr[i], 10) + carry;
            if (num > 9) {
                arr[i] = '0';
                carry = 1;
            } else {
                arr[i] = num.toString();
                carry = 0;
                break;
            }
        }
    }

    if (carry === 1) {
        arr.unshift('1');
    }

    return arr.join('');
};

// 测试函数
console.log(incrementAlphaString("azz")); // Output: "baa"
console.log(incrementNumberString("199")); // Output: "200"
console.log(incrementAlphaNumericString("a1z9")); // Output: "a2a0"
