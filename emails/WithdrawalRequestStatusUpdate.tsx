import * as React from 'react';
import { Html, Button, Heading, Text, Section, Container, Hr } from '@react-email/components';

interface WithdrawalRequestStatusUpdateProps {
  displayName: string;
  status: 'approved' | 'rejected';
  netAmount: number;
  rejectionReason?: string;
  dashboardUrl: string;
}

export const WithdrawalRequestStatusUpdate: React.FC<WithdrawalRequestStatusUpdateProps> = ({
  displayName,
  status,
  netAmount,
  rejectionReason,
  dashboardUrl,
}) => (
  <Html>
    <Container style={container}>
      <Heading style={heading}>Withdrawal Request {status === 'approved' ? 'Approved' : 'Rejected'}</Heading>
      <Section style={section}>
        <Text style={text}>Hi {displayName},</Text>
        <Text style={text}>
          Your withdrawal request for <strong>₦{netAmount.toFixed(2)}</strong> has been{' '}
          <strong>{status}</strong>.
        </Text>
        {status === 'rejected' && (
          <>
            <Hr style={hr} />
            <Text style={text}>
              <strong>Reason for Rejection:</strong>
            </Text>
            <Text style={text}>{rejectionReason || 'No reason provided.'}</Text>
            <Text style={text}>
              The requested amount has been refunded to your TaskPlay balance.
            </Text>
          </>
        )}
        {status === 'approved' && (
            <Text style={text}>
                The funds should reflect in your bank account shortly.
            </Text>
        )}
        <Hr style={hr} />
        <Button style={button} href={dashboardUrl}>
          View on Dashboard
        </Button>
      </Section>
    </Container>
  </Html>
);

export default WithdrawalRequestStatusUpdate;

// Styles
const container = { fontFamily: 'Arial, sans-serif', backgroundColor: '#f4f4f4', padding: '20px' };
const heading = { fontSize: '24px', color: '#333' };
const section = { backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px' };
const text = { fontSize: '16px', color: '#555', lineHeight: '1.5' };
const hr = { borderColor: '#cccccc', margin: '20px 0' };
const button = {
  backgroundColor: '#007bff',
  color: '#ffffff',
  padding: '10px 20px',
  borderRadius: '5px',
  textDecoration: 'none',
  marginTop: '20px',
  display: 'inline-block',
};