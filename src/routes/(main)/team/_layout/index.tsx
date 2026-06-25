import { Flexbox } from '@lobehub/ui';
import { type FC } from 'react';
import { Outlet } from 'react-router';

import { isDesktop } from '@/const/version';
import ProtocolUrlHandler from '@/features/ProtocolUrlHandler';
import { useInitGroupConfig } from '@/hooks/useInitGroupConfig';

import { styles } from './style';
import TeamIdSync from './TeamIdSync';

const Layout: FC = () => {
  useInitGroupConfig();

  return (
    <>
      <Flexbox className={styles.mainContainer} flex={1} height={'100%'}>
        <Outlet />
      </Flexbox>
      {isDesktop && <ProtocolUrlHandler />}
      <TeamIdSync />
    </>
  );
};

export default Layout;
