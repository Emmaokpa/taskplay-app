import * as React from 'react';
import { Html, Button, Heading, Text, Section, Container, Hr } from '@react-email/components';

interface WithdrawalRequestUserConfirmationProps {
  displayName: string;
  grossAmount: number;
  fee: number;
  netAmount: number;
  dashboardUrl: string;
}

export const WithdrawalRequestUserConfirmation: React.FC<WithdrawalRequestUserConfirmationProps> = ({
  displayName,
  grossAmount,
  fee,
  netAmount,
  dashboardUrl,
}) => (
  <Html>
    <Container style={container}>
      <Heading style={heading}>Withdrawal Request Received</Heading>
      <Section style={section}>
        <Text style={text}>Hi {displayName},</Text>
        <Text style={text}>
          We've received your withdrawal request. It is now being processed. You will receive another email once the status is updated.
        </Text>
        <Hr style={hr} />
        <Text style={text}>
          <strong>Request Summary:</strong>
        </Text>
        <Text style={text}>Gross Amount: ₦{grossAmount.toFixed(2)}</Text>
        <Text style={text}>Processing Fee (5%): -₦{fee.toFixed(2)}</Text>
        <Text style={{ ...text, fontWeight: 'bold' }}>
          Net Payout Amount: ₦{netAmount.toFixed(2)}
        </Text>
        <Hr style={hr} />
        <Button style={button} href={dashboardUrl}>
          View on Dashboard
        </Button>
      </Section>
    </Container>
  </Html>
);

export default WithdrawalRequestUserConfirmation;

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