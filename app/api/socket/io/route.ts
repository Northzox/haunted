import { NextApiRequest, NextApiResponse } from 'next';
import SocketHandler from '@/server/socket';

const SocketHandlerWrapper = (req: NextApiRequest, res: NextApiResponse) => {
  SocketHandler(req, res);
};

export default SocketHandlerWrapper;
