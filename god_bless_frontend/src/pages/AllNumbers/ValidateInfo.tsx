import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ValidateInfo = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/validate-number', { replace: true });
  }, [navigate]);

  return null;
};

export default ValidateInfo;
