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
        setTimeout(() => {
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
    return incrementedStr;
}




// 数字和字母混合递增
export const incrementAlphaNumericString = (str: string): string => {
    const length = str.length;
    let carry = 1;
    let result = '';

    for (let i = length - 1; i >= 0; i--) {
        const currentChar = str[i];
        let newChar = '';
        if (/\d/.test(currentChar)) { // 当前字符是数字
            let newDigit = (parseInt(currentChar) + carry) % 10;
            carry = (parseInt(currentChar) + carry) >= 10 ? 1 : 0;
            newChar = newDigit.toString();
        } else if (/[A-Z]/.test(currentChar)) { // 当前字符是大写字母
            let newIndex = (currentChar.charCodeAt(0) - 'A'.charCodeAt(0) + carry) % 26;
            carry = (currentChar.charCodeAt(0) - 'A'.charCodeAt(0) + carry) >= 26 ? 1 : 0;
            newChar = String.fromCharCode('A'.charCodeAt(0) + newIndex);
        } else {
            throw new Error('Invalid character in input string');
        }

        result = newChar + result;
    }

    // 如果after the final iteration还有一个carryover, 添加到result的开始
    // 对于数字，就是'1'; 对于字母，如果从'Z'递增了就应该补上一个'A'
    if (carry > 0) {
        if (/^\d+$/.test(str)) { // 检查整个字符串是否为纯数字
            result = '1' + result;
        } else if (/^[A-Z]+$/.test(str)) { // 检查整个字符串是否为纯字母
            result = 'A' + result;
        }
        // 对于混合字符串，不自动前置'1'或'A'，因为carry的行为很难有意义地自动处理
    }

    return result;
}

const incrementBase36String = (str: string): string | null => {
    let carry = 1; // 初始化为1来处理最低位的递增
    let result = '';
    const length = str.length;
    const allZ = /^[Z]+$/.test(str); // 检查是否全是Z

    if (allZ) return null; // 如果全是Z，则按照要求返回null

    for (let i = length - 1; i >= 0; i--){
        if (carry === 0){
            result = str[i] + result; // 如果没有进位，直接拼接剩余的字符
            continue;
        }

        let code = str.charCodeAt(i);
        if (code === 57) { // '9' => 'A'
            result = 'A' + result;
            carry = 0;
        } else if (code === 90) { // 'Z' => '0', 并且处理进位
            result = '0' + result;
            carry = 1;
        } else { // 其他情况，直接递增
            result = String.fromCharCode(code + 1) + result;
            carry = 0;
        }
    }
    if (carry === 1) {
       // 处理如"ZZ"这样的输入，此时carry仍然为1，但上面的逻辑已经处理过"ZZ" ==> "00"的情况，所以仅在所有字符处理完毕后检查。
       return '1' + result;
    }
    
    return result;
}

