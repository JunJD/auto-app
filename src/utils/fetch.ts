let index = 0
export const fetchD = async () => {
    return new Promise<string>((resove) => {
        setTimeout(() => {
            resove('hello' + index++)
        }, 100)
    })
}

export const delay = (ms: number) => {
    return new Promise(resolve => {
        setTimeout(()=>{
            resolve(ms)
        }, ms)
    })
}

// 仅有字母递增
export const incrementAlphaString = (str: string): string | null => {
    let arr = str.split('').reverse();

    for (let i = 0; i < arr.length; i++) {
        if (arr[i] === 'Z') {
            arr[i] = 'A';
        } else {
            arr[i] = String.fromCharCode(arr[i].charCodeAt(0) + 1);
            return arr.reverse().join('');
        }
    }

    // 如果所有的字母都是 'Z'，意味着无法再增长
    if (arr.every(char => char === 'A')) {
        return null; // 无法再增长
    }

    return arr.reverse().join('');
};

export const incrementNumberString = (str: string): string | null => {
    // 检查字符串是否全是9
    if (/^9+$/.test(str)) {
        return null;
    }
    
    let num = parseInt(str, 10);
    num += 1;
    
    // 将数字重新格式化为与原始字符串相同的长度
    let incrementedStr = num.toString();
    while (incrementedStr.length < str.length) {
        incrementedStr = '0' + incrementedStr;
    }
    console.log(incrementedStr, 'incrementedStr')
    return incrementedStr;
}




// 数字和字母混合递增
export const incrementAlphaNumericString = (str: string): string | null => {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const charsLength = chars.length;
    let carry = 1;
    let result = '';

    for (let i = str.length - 1; i >= 0; i--) {
        const currentChar = str[i];
        const currentIndex = chars.indexOf(currentChar);

        if (currentIndex === -1) {
            throw new Error('Invalid character in input string');
        }

        let newIndex = currentIndex + carry;
        if (newIndex >= charsLength) {
            newIndex = newIndex % charsLength;
            carry = 1;
        } else {
            carry = 0;
        }

        result = chars[newIndex] + result;
    }

    if (carry > 0) {
        result = '1' + result;
    }

    // 如果输入字符串是全部由'Z'组成的
    if (/^Z+$/.test(str)) {
        return null;
    }

    return result;
}
