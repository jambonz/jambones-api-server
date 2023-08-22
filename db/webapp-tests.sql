SET FOREIGN_KEY_CHECKS=0;

-- create one service provider
insert into service_providers (service_provider_sid, name, description, root_domain) 
values ('2708b1b3-2736-40ea-b502-c53d8396247f', 'jambonz.cloud', 'jambonz.cloud service provider', 'sip.yakeeda.com');
insert into api_keys (api_key_sid, token) 
values ('3f35518f-5a0d-4c2e-90a5-2407bb3b36f0', '38700987-c7a4-4685-a5bb-af378f9734de');

-- one sbc
insert into sbc_addresses (sbc_address_sid, service_provider_sid, ipv4, port) values ('8d6d0fda-4550-41ab-8e2f-60761d81fe7d', null, '3.39.45.30', '5060');

-- two smpp server
insert into smpp_addresses (smpp_address_sid, service_provider_sid, ipv4, port, use_tls, is_primary) values ('e5e8345b-d533-4c29-940b-57aaccc59f8b', null, '3.39.45.30', '2775', false, true);
insert into smpp_addresses (smpp_address_sid, service_provider_sid, ipv4, port, use_tls, is_primary) values ('ae060ef3-d5a4-4842-b331-426ec9329fbe', null, '3.39.45.30', '3550', true, true);

-- one voip carrier with one gateway
insert into voip_carriers (voip_carrier_sid, name) values ('5145b436-2f38-4029-8d4c-fd8c67831c7a', 'my test carrier');
insert into sip_gateways (sip_gateway_sid, voip_carrier_sid, ipv4, port, inbound, outbound, is_active)
values ('46b727eb-c7dc-44fa-b063-96e48d408e4a', '5145b436-2f38-4029-8d4c-fd8c67831c7a', '3.3.3.3', 5060, 1, 1, 1);

-- create the test application and test phone number
insert into webhooks (webhook_sid, url, method) values ('d9c205c6-a129-443e-a9c0-d1bb437d4bb7', 'https://flows.jambonz.cloud/testCall', 'POST');
insert into webhooks (webhook_sid, url, method) values ('6ac36aeb-6bd0-428a-80a1-aed95640a296', 'https://flows.jambonz.cloud/callStatus', 'POST');
insert into applications (application_sid, name, service_provider_sid, call_hook_sid, call_status_hook_sid, 
speech_synthesis_vendor, speech_synthesis_language, speech_synthesis_voice, speech_recognizer_vendor, speech_recognizer_language)
values ('7a489343-02ed-471e-8df0-fc5e1b98ce8f', 'Test application', '2708b1b3-2736-40ea-b502-c53d8396247f', 
'd9c205c6-a129-443e-a9c0-d1bb437d4bb7','6ac36aeb-6bd0-428a-80a1-aed95640a296','google', 'en-US', 'en-US-Standard-C', 'google', 'en-US');
insert into phone_numbers (phone_number_sid, number, voip_carrier_sid, service_provider_sid)
values ('ec028c46-1363-4b3f-81db-ee33f179d6ba', '18005551212', '5145b436-2f38-4029-8d4c-fd8c67831c7a', '2708b1b3-2736-40ea-b502-c53d8396247f');

-- create our products
insert into products (product_sid, name, category)
values
('c4403cdb-8e75-4b27-9726-7d8315e3216d', 'concurrent call session', 'voice_call_session'),
('2c815913-5c26-4004-b748-183b459329df', 'registered device', 'device'),
('35a9fb10-233d-4eb9-aada-78de5814d680', 'api call', 'api_rate');

-- create predefined carriers
insert into predefined_carriers (predefined_carrier_sid, name, requires_static_ip, e164_leading_plus, 
requires_register, register_username, register_password, 
register_sip_realm, tech_prefix, inbound_auth_username, inbound_auth_password, diversion)
VALUES
('7d509a18-bbff-4c5d-b21e-b99bf8f8c49a', 'Twilio', 0, 1, 0, '<your-twilio-credential-username>', '<your-twilio-credential-password>', NULL, NULL, NULL, NULL, NULL),
('032d90d5-39e8-41c0-b807-9c88cffba65c', 'Voxbone', 0, 1, 0, '<your-voxbone-outbound-username>', '<your-voxbone-outbound-password>', NULL, NULL, NULL, NULL, '<your-voxbone-DID>'),
('17479288-bb9f-421a-89d1-f4ac57af1dca', 'Peerless Network (US)', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('bdf70650-5328-47aa-b3d0-47cb219d9c6e', '382 Communications (US)', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('e6fb301a-1af0-4fb8-a1f6-f65530c6e1c6', 'Simwood', 0, 1, 0, '<your-simwood-auth-trunk-username>',  '<your-simwood-auth-trunk-password>', NULL, NULL, NULL, NULL, NULL);

-- twilio gateways
insert into predefined_sip_gateways (predefined_sip_gateway_sid, predefined_carrier_sid, ipv4, netmask, port, inbound, outbound)
VALUES
('d2ccfcb1-9198-4fe9-a0ca-6e49395837c4', '7d509a18-bbff-4c5d-b21e-b99bf8f8c49a', '54.172.60.0', 30, 5060, 1, 0),
('6b1d0032-4430-41f1-87c6-f22233d394ef', '7d509a18-bbff-4c5d-b21e-b99bf8f8c49a', '54.244.51.0', 30, 5060, 1, 0),
('0de40217-8bd5-4aa8-a9fd-1994282953c6', '7d509a18-bbff-4c5d-b21e-b99bf8f8c49a', '54.171.127.192', 30, 5060, 1, 0),
('37bc0b20-b53c-4c31-95a6-f82b1c3713e3', '7d509a18-bbff-4c5d-b21e-b99bf8f8c49a', '35.156.191.128', 30, 5060, 1, 0),
('39791f4e-b612-4882-a37e-e92711a39f3f', '7d509a18-bbff-4c5d-b21e-b99bf8f8c49a', '54.65.63.192', 30, 5060, 1, 0),
('81a0c8cb-a33e-42da-8f20-99083da6f02f', '7d509a18-bbff-4c5d-b21e-b99bf8f8c49a', '54.252.254.64', 30, 5060, 1, 0),
('eeeef07a-46b8-4ffe-a4f2-04eb32ca889e', '7d509a18-bbff-4c5d-b21e-b99bf8f8c49a', '54.169.127.128', 30, 5060, 1, 0),
('fbb6c194-4b68-4dff-9b42-52412be1c39e', '7d509a18-bbff-4c5d-b21e-b99bf8f8c49a', '177.71.206.192', 30, 5060, 1, 0),
('3ed1dd12-e1a7-44ff-811a-3cc5dc13dc72', '7d509a18-bbff-4c5d-b21e-b99bf8f8c49a', '<your-domain>.pstn.twilio.com', 32, 5060, 0, 1);

-- voxbone gateways
insert into predefined_sip_gateways (predefined_sip_gateway_sid, predefined_carrier_sid, ipv4, netmask, port, inbound, outbound)
VALUES
('d531c582-2103-42a0-b9f0-f80c215b3ec5', '032d90d5-39e8-41c0-b807-9c88cffba65c', '81.201.83.45', 32, 5060, 1, 0),
('95c888e5-c959-4d92-82c4-8597dddff75e', '032d90d5-39e8-41c0-b807-9c88cffba65c', '81.201.86.45', 32, 5060, 1, 0),
('1de3b2a1-96f0-407a-bcc4-ce371d823a8d', '032d90d5-39e8-41c0-b807-9c88cffba65c', '81.201.82.45', 32, 5060, 1, 0),
('50c1f91a-6080-4495-a241-6bba6e9d9688', '032d90d5-39e8-41c0-b807-9c88cffba65c', '81.201.85.45', 32, 5060, 1, 0),
('e6ebad33-80d5-4dbb-bc6f-a7ae08160cc6', '032d90d5-39e8-41c0-b807-9c88cffba65c', '81.201.84.45', 32, 5060, 1, 0),
('bc933522-18a2-47d8-9ae4-9faa8de4e927', '032d90d5-39e8-41c0-b807-9c88cffba65c', 'outbound.voxbone.com', 32, 5060, 0, 1);

-- Peerless gateways
insert into predefined_sip_gateways (predefined_sip_gateway_sid, predefined_carrier_sid, ipv4, netmask, port, inbound, outbound)
VALUES
('4e23f698-a70a-4616-9bf0-c9dd5ab123af', '17479288-bb9f-421a-89d1-f4ac57af1dca', '208.79.54.182', 32, 5060, 1, 0),
('e5c71c18-0511-41b8-bed9-1ba061bbcf10', '17479288-bb9f-421a-89d1-f4ac57af1dca', '208.79.52.192', 32, 5060, 0, 1),
('226c7471-2f4f-440f-8525-37fd0512bd8b', '17479288-bb9f-421a-89d1-f4ac57af1dca', '208.79.54.185', 32, 5060, 0, 1);

-- 382com gateways
insert into predefined_sip_gateways (predefined_sip_gateway_sid, predefined_carrier_sid, ipv4, netmask, port, inbound, outbound)
VALUES
('23e4c250-8578-4d88-99b5-a7941a58e26f', 'bdf70650-5328-47aa-b3d0-47cb219d9c6e', '64.125.111.10', 32, 5060, 1, 0),
('c726d435-c9a7-4c37-b891-775990a54638', 'bdf70650-5328-47aa-b3d0-47cb219d9c6e', '64.124.67.11', 32, 5060, 0, 1);

-- simwood gateways
insert into predefined_sip_gateways (predefined_sip_gateway_sid, predefined_carrier_sid, ipv4, netmask, port, inbound, outbound)
VALUES
('441fd2e7-c845-459c-963d-6e917063ed9a', 'e6fb301a-1af0-4fb8-a1f6-f65530c6e1c6', '178.22.136.24', 29, 5060, 1, 0),
('1e0d3e80-9973-4184-9bec-07ae564f983f', 'e6fb301a-1af0-4fb8-a1f6-f65530c6e1c6', '178.22.136.28', 28, 5060, 1, 0),
('e56ec745-5f37-443f-afb4-7bbda31ae7ac', 'e6fb301a-1af0-4fb8-a1f6-f65530c6e1c6', '178.22.140.48', 28, 5060, 1, 0),
('e7447e7e-2c7d-4738-ab53-097c187236ff', 'e6fb301a-1af0-4fb8-a1f6-f65530c6e1c6', '178.22.140.242', 32, 5060, 1, 0),
('279807e7-649e-41dd-931a-00c460bcc0a2', 'e6fb301a-1af0-4fb8-a1f6-f65530c6e1c6', '178.22.143.80', 28, 5060, 1, 0),
('f5fd66f7-97f6-4979-ab19-eea1557bc872', 'e6fb301a-1af0-4fb8-a1f6-f65530c6e1c6', '185.63.140.0', 26, 5060, 1, 0),
('efcfefdc-451c-4e59-960a-f9e4952d964f', 'e6fb301a-1af0-4fb8-a1f6-f65530c6e1c6', '185.63.141.0', 26, 5060, 1, 0),
('b6ae6240-55ac-4c11-892f-a71b2155ea60', 'e6fb301a-1af0-4fb8-a1f6-f65530c6e1c6', '185.63.142.0', 26, 5060, 1, 0),
('5a976337-164b-408e-8748-d8bfb4bd5d76', 'e6fb301a-1af0-4fb8-a1f6-f65530c6e1c6', '185.63.143.0', 26, 5060, 1, 0),
('ed0434ca-7f26-4624-9523-0419d0d2924d', 'e6fb301a-1af0-4fb8-a1f6-f65530c6e1c6', '178.22.139.0', 26, 5060, 1, 0),
('6bfb55e5-e248-48dc-a104-4f3eedd7d7de', 'e6fb301a-1af0-4fb8-a1f6-f65530c6e1c6', '172.86.225.0', 24, 5060, 1, 0),
('5f431d42-48e4-44ce-a311-d946f0b475b6', 'e6fb301a-1af0-4fb8-a1f6-f65530c6e1c6', 'out.simwood.com', 32, 5060, 0, 1);


SET FOREIGN_KEY_CHECKS=1;