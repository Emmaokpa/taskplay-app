import * as React from 'react';
import { Html, Button, Heading, Text, Section, Container } from '@react-email/components';
import { ReactElement } from 'react';

interface WithdrawalRequestAdminNotificationProps {
  displayName: string;
  userEmail: string;
  grossAmount: number;
  netAmount: number;
  adminDashboardUrl: string;
}

export const WithdrawalRequestAdminNotification = ({
  displayName,
  userEmail,
  grossAmount,
  netAmount,
  adminDashboardUrl,
}: WithdrawalRequestAdminNotificationProps): ReactElement => (
  <Html>
    <Container style={container}>
      <Heading style={heading}>New Withdrawal Request</Heading>
      <Section style={section}>
        <Text style={text}>A new withdrawal request has been submitted on TaskPlay.</Text>
        <Text style={text}>
          <strong>User:</strong> {displayName} ({userEmail})
        </Text>
        <Text style={text}>
          <strong>Gross Amount:</strong> ₦{grossAmount.toFixed(2)}
        </Text>
        <Text style={text}>
          <strong>Net Payout:</strong> ₦{netAmount.toFixed(2)}
        </Text>
        <Text style={text}>Please review this request in the admin panel.</Text>
        <Button style={button} href={adminDashboardUrl}>
          Go to Admin Panel
        </Button>
      </Section>
    </Container>
  </Html>
);

// Explicit default export with type annotation
const WithdrawalRequestAdminNotificationExport: React.FC<WithdrawalRequestAdminNotificationProps> = WithdrawalRequestAdminNotification;
export default WithdrawalRequestAdminNotificationExport;

// Styles
const container = {
  fontFamily: 'Arial, sans-serif',
  backgroundColor: '#f4f4f4',
  padding: '20px',
};
const heading = {
  fontSize: '24px',
  color: '#333',
};
const section = {
  backgroundColor: '#ffffff',
  padding: '20px',
  borderRadius: '8px',
};
const text = {
  fontSize: '16px',
  color: '#555',
  lineHeight: '1.5',
};
const button = {
  backgroundColor: '#007bff',
  color: '#ffffff',
  padding: '10px 20px',
  borderRadius: '5px',
  textDecoration: 'none',
  marginTop: '20px',
  display: 'inline-block',
};