import { Box, Container, Typography } from "@mui/material";
import { NextPage } from "next";
import React from "react";
import { MainAppBar } from "src/components/appBar";
import { PageTitle } from "src/components/typography";

export const PricingManagementPage: NextPage = () => {
  return (
    <>
      <MainAppBar />
      <Container maxWidth="lg" sx={{ position: "relative" }}>
        <PageTitle title="Pengaturan" />
      </Container>
    </>
  );
};
