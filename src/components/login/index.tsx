"use client"
import * as React from 'react';
import Button from '@mui/joy/Button';
import Input from '@mui/joy/Input';
import Stack from '@mui/joy/Stack';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
export default function InputFormProps(props: any) {
    
    const {
        onSubmit,
    } = props
    
    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                const usercode = formData.get('usercode');
                const password = formData.get('password');
                localStorage.setItem('usercode', usercode as string);
                localStorage.setItem('password', password as string);
                onSubmit && onSubmit({
                    usercode: usercode as string,
                    password: password as string,
                })
                location.reload()
            }}
        >
            <Stack spacing={1}>
                <FormControl sx={{ flex: '1' }}>
                    <FormLabel>
                        账号
                    </FormLabel>
                    <Input placeholder="账号" required name='usercode' defaultValue={localStorage.getItem('usercode') ?? '城南浩子'}/>
                </FormControl>
                <FormControl sx={{ flex: '1' }}>
                    <FormLabel>
                        密码
                    </FormLabel>
                    <Input placeholder="密码" required name='password' defaultValue={localStorage.getItem('password') ?? 'zhou200266..'}/>
                </FormControl>
                <Button type="submit">提交</Button>
            </Stack>
        </form>
    );
}
