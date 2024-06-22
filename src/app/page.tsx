import * as React from 'react';
import Tabs from '@mui/joy/Tabs';
import TabList from '@mui/joy/TabList';
import Tab from '@mui/joy/Tab';
import Stack from '@mui/joy/Stack';
import TabPanel from '@mui/joy/TabPanel';
import CardNum from '@/components/CardNum';
import BatteryNo from '@/components/BatteryNo';

export default function TabsFlex() {
  return (
    <Stack spacing={2} width={'100%'} height={'100vh'}>
      <Tabs aria-label="Flex auto tabs" sx={{ height: '100%'}}>
        <TabList tabFlex="auto">
          <Tab>查询及过滤车架号</Tab>
          <Tab>查询及过滤电池码</Tab>
          <Tab>绑定测试电池有效性</Tab>
        </TabList>
        <TabPanel value={0} sx={{ overflowY: "hidden" }}>
          <CardNum />
        </TabPanel>
        <TabPanel value={1}>
          <BatteryNo />
        </TabPanel>
        <TabPanel value={2}>
          2
        </TabPanel>
      </Tabs>
    </Stack>
  );
}